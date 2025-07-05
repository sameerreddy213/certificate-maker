import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import CertificateTemplate from '../models/CertificateTemplate';
import CertificateBatch, { ICertificateBatch } from '../models/CertificateBatch';
import Certificate, { ICertificate } from '../models/Certificate'; // ADDED: Import Certificate and ICertificate
import { generateDocxWithData, convertDocxToPdf } from '../services/documentProcessor';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import archiver from 'archiver';
import { promises as fsPromises } from 'fs';

// Define a custom Request type for batch generation
interface BatchGenerationRequest extends Request {
  user: AuthenticatedRequest['user'];
  file?: Express.Multer.File;
  body: {
    templateId: string;
    mappings: string;
    batchName?: string; // ADDED: to resolve error TS2339
  }
  params: {
    batchId: string;
    certIndex?: string;
  }
}

// @desc    Get all batches for the authenticated user
// @route   GET /api/batches
// @access  Private
export const getBatches = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  try {
    const batches = await CertificateBatch.find({ user_id: req.user.id }) // Use user_id
      .populate('template_id', 'name') // Populate template name
      .sort({ createdAt: -1 });

    // Format for client side (History.tsx and Dashboard.tsx)
    const formattedBatches = batches.map(batch => ({
      id: batch._id,
      batch_name: batch.batch_name,
      template_id: batch.template_id,
      template_name: (batch.template_id as any)?.name || 'Unknown Template', // Access populated name
      total_certificates: batch.total_certificates,
      generated_certificates: batch.generated_certificates,
      status: batch.status,
      batch_zip_url: batch.batch_zip_url,
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


// @desc    Initiate batch certificate generation (renamed from generateCertificatesBatch)
// @route   POST /api/batches/generate
// @access  Private
export const startBatchGeneration = async (req: BatchGenerationRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
  }
  const userId: string = String(req.user.id);

  let newBatch: ICertificateBatch | null = null;
  let batchOutputDir: string | null = null;
  const dataFile = req.file;
  const { templateId, mappings: mappingsJson, batchName } = req.body; // batchName is now part of req.body

  if (!dataFile) {
    return res.status(400).json({ message: 'Data file (Excel/CSV) is required.' });
  }
  if (!templateId || !mappingsJson) {
    if (dataFile && fs.existsSync(dataFile.path)) {
      fs.unlinkSync(dataFile.path);
    }
    return res.status(400).json({ message: 'Template ID and column mappings are required.' });
  }

  try {
    const template = await CertificateTemplate.findById(templateId);
    if (!template) {
      if (dataFile && fs.existsSync(dataFile.path)) {
        fs.unlinkSync(dataFile.path);
      }
      return res.status(404).json({ message: 'Selected template not found.' });
    }

    const mappings = JSON.parse(mappingsJson);

    const workbook = xlsx.readFile(dataFile.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dataRows = xlsx.utils.sheet_to_json(sheet) as Record<string, any>[];

    if (dataRows.length === 0) {
        if (dataFile && fs.existsSync(dataFile.path)) {
            fs.unlinkSync(dataFile.path);
        }
        return res.status(400).json({ message: 'The uploaded data file is empty.' });
    }

    batchOutputDir = path.join(__dirname, '../../generated_certificates', String(new Date().getTime()));
    await fsPromises.mkdir(batchOutputDir, { recursive: true });

    newBatch = new CertificateBatch({
      template_id: template._id,
      user_id: userId,
      status: 'pending',
      batch_name: batchName || `Batch ${new Date().toLocaleString()}`,
      total_certificates: dataRows.length,
      generated_certificates: 0,
    });
    await newBatch.save();

    res.status(202).json({
      message: 'Certificate generation started. Check batch status for updates.',
      batchId: newBatch._id,
    });

    newBatch.status = 'processing';
    await newBatch.save();
    console.log(`[Batch ${newBatch._id}] Starting generation of ${dataRows.length} certificates.`);

    // Use a separate array for generated cert paths to create individual Certificate documents later
    const tempGeneratedCertInfo: { recipientName: string; pdfRelativePath: string; originalDataRow: Record<string, any>; }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      let currentCertStatus: 'generated' | 'failed' = 'failed';
      let currentErrorMessage: string | undefined = undefined;
      let certPdfRelativePath: string | undefined = undefined;
      let recipientName = row[Object.keys(row)[0]] || `Recipient ${i + 1}`; // Default recipient name

      try {
        const certificateData: Record<string, any> = {};

        for (const excelCol in mappings) {
          const templatePlaceholder = mappings[excelCol];
          if (row[excelCol] !== undefined) {
            certificateData[templatePlaceholder] = String(row[excelCol]);
          }
          if (templatePlaceholder === 'recipientName' && row[excelCol]) { // Update recipientName if a mapping exists
            recipientName = String(row[excelCol]);
          }
        }

        const safeRecipientName = recipientName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const uniqueFileName = `${safeRecipientName || `certificate-${i + 1}`}-${new Date().getTime()}-${i}`;
        const tempDocxPath = path.join(batchOutputDir, `${uniqueFileName}.docx`);
        const finalPdfPath = path.join(batchOutputDir, `${uniqueFileName}.pdf`);

        await generateDocxWithData(template.templateFilePath, certificateData, tempDocxPath);
        await convertDocxToPdf(tempDocxPath, finalPdfPath);
        await fsPromises.unlink(tempDocxPath);

        certPdfRelativePath = path.relative(path.join(__dirname, '../../'), finalPdfPath);
        currentCertStatus = 'generated';
        tempGeneratedCertInfo.push({ recipientName, pdfRelativePath: certPdfRelativePath, originalDataRow: row });

        newBatch.generated_certificates += 1;
        await newBatch.save();
        console.log(`[Batch ${newBatch._id}] Generated certificate for ${recipientName}. Progress: ${newBatch.generated_certificates}/${newBatch.total_certificates}`);

      } catch (certError: any) {
        console.error(`Error generating certificate for row ${i + 1} (data: ${JSON.stringify(row)}):`, certError);
        currentErrorMessage = certError.message || 'Error generating individual certificate';
      } finally {
        // Create an individual Certificate document regardless of success or failure
        const individualCertificate = new Certificate({
          userId: userId,
          batchId: newBatch._id,
          recipient_name: recipientName,
          certificate_data: row, // Store the original data row
          status: currentCertStatus,
          certificate_url: certPdfRelativePath,
          error_message: currentErrorMessage,
        });
        await individualCertificate.save();
      }
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `certificates_batch_${newBatch._id}.zip`;
    const outputZipPath = path.join(batchOutputDir, zipFileName);
    const output = fs.createWriteStream(outputZipPath);

    archive.pipe(output);

    // Get all successfully generated certificates from the database
    const successfullyGeneratedCerts = await Certificate.find({ batchId: newBatch._id, status: 'generated' });

    for (const cert of successfullyGeneratedCerts) {
        if (cert.certificate_url) {
            const absPdfPath = path.join(__dirname, '../../', cert.certificate_url);
            if (fs.existsSync(absPdfPath)) {
                archive.file(absPdfPath, { name: path.basename(cert.certificate_url) });
            } else {
                console.warn(`[Batch ${newBatch._id}] Missing PDF file for ${cert.recipient_name} at ${cert.certificate_url}. Skipping from zip.`);
            }
        }
    }
    await archive.finalize();

    newBatch.batch_zip_url = path.relative(path.join(__dirname, '../../'), outputZipPath);
    newBatch.status = 'completed';
    // No longer store individualCertificates array directly in CertificateBatch model
    await newBatch.save();
    console.log(`[Batch ${newBatch._id}] All certificates processed and zipped.`);

  } catch (error: any) {
    console.error('Critical error during batch generation:', error);
    if (newBatch) {
        newBatch.status = 'failed';
        newBatch.error_message = error.message || 'Unknown server error during generation.';
        await newBatch.save();
    }
    if (dataFile && fs.existsSync(dataFile.path)) {
      fs.unlinkSync(dataFile.path);
    }
    if (batchOutputDir && fs.existsSync(batchOutputDir)) {
        await fsPromises.rm(batchOutputDir, { recursive: true, force: true });
    }
  }
};

// @desc    Get status of a specific batch generation
// @route   GET /api/batches/:batchId/status
// @access  Private
export const getBatchStatus = async (req: BatchGenerationRequest, res: Response) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId: string = String(req.user.id);
    try {
        const batch = await CertificateBatch.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.user_id) !== String(userId)) { // Use user_id
            return res.status(403).json({ message: 'Unauthorized access to batch status.' });
        }
        res.status(200).json({ status: batch.status, generated: batch.generated_certificates, total: batch.total_certificates });
    } catch (error: any) {
        console.error('Error fetching batch status:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get details of a specific batch (including individual certificate links)
// @route   GET /api/batches/:batchId/details
// @access  Private
export const getBatchDetails = async (req: BatchGenerationRequest, res: Response) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId: string = String(req.user.id);
    try {
        const batch = await CertificateBatch.findById(req.params.batchId).populate('template_id');
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.user_id) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to batch details.' });
        }

        // Fetch individual certificates from the Certificate model
        const individualCertificates = await Certificate.find({ batchId: batch._id, userId: userId });

        const individualDownloads = individualCertificates.map((cert: ICertificate) => ({ // ADDED: Explicit type for 'cert'
            recipientName: cert.recipient_name,
            downloadUrl: cert.certificate_url ? `${req.protocol}://${req.get('host')}/${cert.certificate_url.replace(/\\/g, '/')}` : null
        }));

        const batchZipDownloadUrl = batch.batch_zip_url ?
            `${req.protocol}://${req.get('host')}/${batch.batch_zip_url.replace(/\\/g, '/')}` :
            null;

        res.status(200).json({
            _id: batch._id,
            batch_name: batch.batch_name, // Added batch_name
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
export const downloadBatchZip = async (req: BatchGenerationRequest, res: Response) => {
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

// @desc    Download a single certificate from a batch
// @route   GET /api/batches/:batchId/download-certificate/:certIndex
// @access  Private
export const downloadIndividualCertificate = async (req: BatchGenerationRequest, res: Response) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId: string = String(req.user.id);
    try {
        const { batchId, certIndex } = req.params;
        const index = parseInt(certIndex ?? '', 10);
        if (isNaN(index)) {
            return res.status(400).json({ message: 'Invalid certificate index.' });
        }

        const batch = await CertificateBatch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.user_id) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to this batch.' });
        }
        // Fetch the individual certificate from the Certificate model
        // Assuming certIndex directly corresponds to the order for skipping (this is an assumption, better to query by unique ID or a more robust index)
        const certificate = await Certificate.findOne({ batchId: batch._id, userId: userId }).skip(index).limit(1);

        if (!certificate || certificate.status !== 'generated' || !certificate.certificate_url) {
            return res.status(400).json({ message: 'Certificate not available or invalid index.' });
        }

        const filePath = path.join(__dirname, '../../', certificate.certificate_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Individual certificate file not found on server.' });
        }

        res.download(filePath, `${certificate.recipient_name || `certificate-${index + 1}`}.pdf`, (err) => {
            if (err) {
                console.error('Error downloading individual certificate:', err);
                res.status(500).json({ message: 'Failed to download certificate file.' });
            }
        });
    } catch (error: any) {
        console.error('Error in downloadIndividualCertificate:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};