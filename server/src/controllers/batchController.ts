import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import CertificateTemplate from '../models/CertificateTemplate';
import CertificateBatch from '../models/CertificateBatch';
import Certificate, { ICertificate } from '../models/Certificate';
import { generateDocxWithData, convertDocxToPdf } from '../services/documentProcessor';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import archiver from 'archiver';
import { promises as fsPromises } from 'fs';

// @desc    Get all batches for the authenticated user
// @route   GET /api/batches
// @access  Private
export const getBatches = async (req: AuthenticatedRequest, res: Response) => {
    // The 'protect' middleware guarantees req.user exists.
    const userId = req.user!.id; 

    try {
        const batches = await CertificateBatch.find({ user_id: userId })
            .populate('template_id', 'name')
            .sort({ createdAt: -1 });

        const formattedBatches = batches.map(batch => ({
            id: batch._id,
            batch_name: batch.batch_name,
            template_id: batch.template_id,
            template_name: (batch.template_id as any)?.name || 'Unknown Template',
            total_certificates: batch.total_certificates,
            generated_certificates: batch.generated_certificates,
            status: batch.status,
            batch_zip_url: batch.batch_zip_url ? `${req.protocol}://${req.get('host')}/${batch.batch_zip_url.replace(/\\/g, '/')}` : null,
            error_message: batch.error_message,
            created_at: batch.createdAt,
            updated_at: batch.updatedAt,
        }));
        res.status(200).json(formattedBatches);
    } catch (error: any) {
        console.error('Error fetching batches:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Initiate batch certificate generation
// @route   POST /api/batches/generate
// @access  Private
export const startBatchGeneration = async (req: AuthenticatedRequest, res: Response) => {
    // Ensure user and file are present
    if (!req.user || !req.file) {
        // If file is missing, respond immediately. If user is missing, auth middleware should handle.
        return res.status(400).json({ message: 'User not authenticated or data file is missing.' });
    }

    const userId = req.user.id;
    const dataFile = req.file; // The uploaded Excel/CSV file
    const { templateId, mappings: mappingsJson, batchName } = req.body; // Data from the request body

    // Variable to hold the new batch document, initialized to null
    let newBatch: any = null;
    // Variable to hold the output directory for generated certificates, initialized to null
    let batchOutputDir: string | null = null;

    try {
        // 1. Basic input validation
        if (!templateId || !mappingsJson) {
            // If essential data is missing, delete the uploaded file and send error response
            if (dataFile && fs.existsSync(dataFile.path)) {
                await fsPromises.unlink(dataFile.path);
            }
            return res.status(400).json({ message: 'Template ID and column mappings are required.' });
        }

        // 2. Find the certificate template by its ID
        const template = await CertificateTemplate.findById(templateId);
        if (!template) {
            // If template not found, delete the uploaded file and throw an error
            if (dataFile && fs.existsSync(dataFile.path)) {
                await fsPromises.unlink(dataFile.path);
            }
            throw new Error('Selected template not found.');
        }

        // 3. Parse the JSON mappings from the request body
        const mappings = JSON.parse(mappingsJson);

        // 4. Read the uploaded Excel/CSV file
        const workbook = xlsx.readFile(dataFile.path);
        // Get the name of the first sheet, or default to the first sheet if name is not available
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[Object.keys(workbook.Sheets)[0]];
        // Convert sheet data to JSON array
        const dataRows = xlsx.utils.sheet_to_json(sheet) as Record<string, any>[];

        // 5. Handle empty data file
        if (dataRows.length === 0) {
            if (dataFile && fs.existsSync(dataFile.path)) {
                await fsPromises.unlink(dataFile.path);
            }
            return res.status(400).json({ message: 'The uploaded data file is empty.' });
        }

        // 6. Create a unique output directory for this batch's certificates
        batchOutputDir = path.join(__dirname, '../../generated_certificates', String(Date.now()));
        await fsPromises.mkdir(batchOutputDir, { recursive: true });

        // 7. Create a new CertificateBatch record in the database
        newBatch = new CertificateBatch({
            template_id: template._id,
            user_id: userId,
            status: 'pending', // Initial status is pending
            batch_name: batchName || `Batch ${new Date().toLocaleString()}`, // Use provided name or generate one
            total_certificates: dataRows.length,
            generated_certificates: 0, // Initialize generated count
        });
        await newBatch.save(); // Save the batch to get its ID

        // 8. Send a 202 Accepted response to the client immediately
        // This allows the client to poll for status updates while generation happens asynchronously
        res.status(202).json({
            message: 'Certificate generation started. Check batch status for updates.',
            batchId: newBatch._id,
        });

        // 9. Update batch status to 'processing' after sending initial response
        newBatch.status = 'processing';
        await newBatch.save();
        console.log(`[Batch ${newBatch._id}] Starting generation of ${dataRows.length} certificates.`);

        // 10. Iterate through each row of data to generate certificates
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            // Determine recipient name, default if not found
            const recipientName = String(row[Object.keys(row)[0]] || `Recipient ${i + 1}`);
            let individualCertificate: ICertificate | null = null; // Variable for the individual certificate document

            try {
                // Construct certificate data based on mappings
                const certificateData: Record<string, string> = Object.keys(mappings).reduce((acc, excelCol) => {
                    if (row[excelCol] !== undefined) {
                        acc[mappings[excelCol]] = String(row[excelCol]);
                    }
                    return acc;
                }, {} as Record<string, string>);

                // Create unique file names for DOCX and PDF
                const safeRecipientName = recipientName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
                const uniqueFileName = `${safeRecipientName || `certificate-${i + 1}`}-${newBatch._id}-${i}`;
                const tempDocxPath = path.join(batchOutputDir, `${uniqueFileName}.docx`);
                const finalPdfPath = path.join(batchOutputDir, `${uniqueFileName}.pdf`);

                // Generate DOCX and convert to PDF
                await generateDocxWithData(template.templateFilePath, certificateData, tempDocxPath);
                await convertDocxToPdf(tempDocxPath, finalPdfPath);
                await fsPromises.unlink(tempDocxPath); // Delete temporary DOCX file

                // Create and save individual Certificate document for successful generation
                individualCertificate = new Certificate({
                    userId: userId,
                    batchId: newBatch._id,
                    recipient_name: recipientName,
                    certificate_data: row, // Store the original data row
                    status: 'generated',
                    certificate_url: path.relative(path.join(__dirname, '../../'), finalPdfPath), // Store relative path
                });
                await individualCertificate.save();
                
                // Increment generated count for the batch and save
                newBatch.generated_certificates += 1;
                await newBatch.save();
                console.log(`[Batch ${newBatch._id}] Generated certificate for ${recipientName}. Progress: ${newBatch.generated_certificates}/${newBatch.total_certificates}`);

            } catch (certError: any) {
                // Handle errors during individual certificate generation
                console.error(`Error generating certificate for row ${i + 1} (recipient: ${recipientName}):`, certError.message);
                
                // Create and save individual Certificate document for failed generation
                individualCertificate = new Certificate({
                    userId: userId,
                    batchId: newBatch._id,
                    recipient_name: recipientName,
                    certificate_data: row, // Store the original data row
                    status: 'failed',
                    error_message: certError.message || 'Error generating individual certificate',
                });
                await individualCertificate.save();
            }
        }

        // 11. Archive all successfully generated PDFs into a single ZIP file
        const archive = archiver('zip', { zlib: { level: 9 } }); // Use best compression
        const zipFileName = `certificates_batch_${newBatch._id}.zip`;
        const outputZipPath = path.join(batchOutputDir, zipFileName);
        const output = fs.createWriteStream(outputZipPath);

        archive.pipe(output); // Pipe archive data to the output file

        // Fetch all successfully generated certificates from the database for this batch
        const successfullyGeneratedCerts = await Certificate.find({ batchId: newBatch._id, status: 'generated' });

        for (const cert of successfullyGeneratedCerts) {
            if (cert.certificate_url) {
                const absPdfPath = path.join(__dirname, '../../', cert.certificate_url);
                if (fs.existsSync(absPdfPath)) {
                    // Append the PDF file to the zip archive
                    archive.file(absPdfPath, { name: path.basename(cert.certificate_url) });
                } else {
                    console.warn(`[Batch ${newBatch._id}] Missing PDF file for ${cert.recipient_name} at ${cert.certificate_url}. Skipping from zip.`);
                }
            }
        }
        await archive.finalize(); // Finalize the archive (this returns a promise)

        // 12. Update the batch record with the ZIP file URL and 'completed' status
        newBatch.batch_zip_url = path.relative(path.join(__dirname, '../../'), outputZipPath);
        newBatch.status = 'completed';
        await newBatch.save();
        console.log(`[Batch ${newBatch._id}] All certificates processed and zipped.`);

    } catch (error: any) {
        // 13. Handle critical errors that occur during the batch generation process
        console.error('Critical error during batch generation:', error);
        if (newBatch) {
            // If a batch record was created, update its status to 'failed' and store the error message
            newBatch.status = 'failed';
            newBatch.error_message = error.message || 'Unknown server error during generation.';
            await newBatch.save();
        }
        // Clean up uploaded data file if it exists
        if (dataFile && fs.existsSync(dataFile.path)) {
            await fsPromises.unlink(dataFile.path);
        }
        // Clean up the partially created batch output directory if it exists
        if (batchOutputDir && fs.existsSync(batchOutputDir)) {
            await fsPromises.rm(batchOutputDir, { recursive: true, force: true });
        }
    } finally {
        // Ensure the uploaded data file is always deleted, regardless of success or failure
        if (dataFile && fs.existsSync(dataFile.path)) {
            await fsPromises.unlink(dataFile.path);
        }
    }
};

// @desc    Get status of a specific batch generation
// @route   GET /api/batches/:batchId/status
// @access  Private
export const getBatchStatus = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { batchId } = req.params;

    try {
        const batch = await CertificateBatch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });
        if (batch.user_id.toString() !== userId) return res.status(403).json({ message: 'Unauthorized.' });
        
        res.status(200).json({ 
            status: batch.status, 
            generated: batch.generated_certificates, 
            total: batch.total_certificates 
        });
    } catch (error: any) {
        console.error('Error fetching batch status:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get details of a specific batch
// @route   GET /api/batches/:batchId/details
// @access  Private
export const getBatchDetails = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { batchId } = req.params;
    
    try {
        const batch = await CertificateBatch.findById(batchId).populate('template_id', 'name');
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });
        if (batch.user_id.toString() !== userId) return res.status(403).json({ message: 'Unauthorized.' });

        // Fetch individual certificates associated with this batch and user
        const individualCertificates = await Certificate.find({ batchId: batch._id, userId: userId });

        const individualDownloads = individualCertificates.map((cert: ICertificate) => ({
            _id: cert._id, // Include the certificate ID for direct access
            recipientName: cert.recipient_name,
            status: cert.status,
            error_message: cert.error_message,
            // Construct full URL for download/view based on the stored relative path
            downloadUrl: cert.certificate_url ? `${req.protocol}://${req.get('host')}/api/certificates/${cert._id}/download` : null,
            viewUrl: cert.certificate_url ? `${req.protocol}://${req.get('host')}/api/certificates/${cert._id}/view` : null,
        }));

        const batchZipDownloadUrl = batch.batch_zip_url ?
            `${req.protocol}://${req.get('host')}/${batch.batch_zip_url.replace(/\\/g, '/')}` :
            null;

        res.status(200).json({
            _id: batch._id,
            batch_name: batch.batch_name,
            template_name: (batch.template_id as any)?.name || 'Unknown Template',
            status: batch.status,
            total_certificates: batch.total_certificates,
            generated_certificates: batch.generated_certificates,
            created_at: batch.createdAt,
            updated_at: batch.updatedAt,
            individualDownloads,
            batchZipDownloadUrl,
            error_message: batch.error_message,
        });

    } catch (error: any) {
        console.error('Error fetching batch details:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Download the zipped batch of certificates
// @route   GET /api/batches/:batchId/download-zip
// @access  Private
export const downloadBatchZip = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId: string = String(req.user.id);
    try {
        const batch = await CertificateBatch.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.user_id) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to this batch.' });
        }
        if (batch.status !== 'completed' || !batch.batch_zip_url) {
            return res.status(400).json({ message: 'Batch is not yet completed or zip file is not available.' });
        }

        const filePath = path.join(__dirname, '../../', batch.batch_zip_url);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Zip file not found on server.' });
        }

        res.download(filePath, `certificates_batch_${batch._id}.zip`, (err) => {
            if (err) {
                console.error('Error downloading batch zip:', err);
                res.status(500).json({ message: 'Failed to download zip file.' });
            }
        });
    } catch (error: any) {
        console.error('Error in downloadBatchZip:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Download a single certificate from a batch by its ID
// @route   GET /api/certificates/:id/download
// @access  Private
export const downloadIndividualCertificate = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) return res.status(404).json({ message: 'Certificate not found' });

        // Security check: ensure the user owns this certificate
        if (certificate.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        if (!certificate.certificate_url) {
            return res.status(404).json({ message: 'Certificate file URL not found.' });
        }

        const filePath = path.join(__dirname, '../../', certificate.certificate_url);

        if (fs.existsSync(filePath)) {
            res.download(filePath); // Triggers browser download
        } else {
            res.status(404).json({ message: 'Certificate file not found on server.' });
        }
    } catch (error: any) {
        console.error('Error downloading individual certificate:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    View a single certificate in the browser
// @route   GET /api/certificates/:id/view
// @access  Private
export const viewIndividualCertificate = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) return res.status(404).json({ message: 'Certificate not found' });

        if (certificate.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        if (!certificate.certificate_url) {
            return res.status(404).json({ message: 'Certificate file URL not found.' });
        }

        const filePath = path.join(__dirname, '../../', certificate.certificate_url);

        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline'); // Tells browser to display inline
            res.sendFile(filePath);
        } else {
            res.status(404).json({ message: 'Certificate file not found on server.' });
        }
    } catch (error: any) {
        console.error('Error viewing individual certificate:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
