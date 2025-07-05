// server/src/controllers/batchController.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware'; // Import AuthenticatedRequest
import CertificateTemplate from '../models/CertificateTemplate';
import CertificateBatch, { ICertificateBatch } from '../models/CertificateBatch';
import { generateDocxWithData, convertDocxToPdf } from '../services/documentProcessor';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import archiver from 'archiver';
import { promises as fsPromises } from 'fs';

// Define a custom Request type for batch generation
// We extend Request directly and ensure 'user' is typed as required,
// assuming 'protect' middleware guarantees its presence.
// If your AuthenticatedRequest defines 'user?: IUser', this will still work
// because we handle it with the explicit guard and type assertion inside functions.
interface BatchGenerationRequest extends Request {
  user: AuthenticatedRequest['user']; // Type assertion for user property
  file?: Express.Multer.File;
  body: {
    templateId: string;
    mappings: string; // JSON string
  }
  params: {
    batchId: string;
    certIndex?: string;
  }
}

// @desc    Initiate batch certificate generation
// @route   POST /api/batches/generate
// @access  Private
export const generateCertificatesBatch = async (req: BatchGenerationRequest, res: Response) => {
  // --- START FIX: Explicitly check req.user and assign to a guaranteed local variable ---
  if (!req.user || !req.user.id) { // Check both req.user and req.user.id for extra robustness
    return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
  }
  // Convert req.user.id to a string and explicitly type it to overcome TS strictness
  const userId: string = String(req.user.id);
  // --- END FIX ---

  let newBatch: ICertificateBatch | null = null;
  let batchOutputDir: string | null = null;
  const dataFile = req.file;
  const { templateId, mappings: mappingsJson } = req.body;

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
      templateId: template._id,
      owner: userId, // Use the guaranteed userId
      status: 'pending',
      totalCertificates: dataRows.length,
      generatedCertificates: 0,
      individualCertificates: [],
    });
    await newBatch.save();

    res.status(202).json({
      message: 'Certificate generation started. Check batch status for updates.',
      batchId: newBatch._id,
    });

    newBatch.status = 'processing';
    await newBatch.save();
    console.log(`[Batch ${newBatch._id}] Starting generation of ${dataRows.length} certificates.`);

    const generatedCertPaths: { recipientName: string; pdfPath: string; originalDataRow: Record<string, any> }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      try {
        const certificateData: Record<string, any> = {};
        let recipientName = row[Object.keys(row)[0]] || `Recipient ${i + 1}`;

        for (const excelCol in mappings) {
          const templatePlaceholder = mappings[excelCol];
          if (row[excelCol] !== undefined) {
            certificateData[templatePlaceholder] = String(row[excelCol]);
          }
          if (templatePlaceholder === 'recipientName' && row[excelCol]) {
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

        generatedCertPaths.push({
            recipientName,
            pdfPath: path.relative(path.join(__dirname, '../../'), finalPdfPath),
            originalDataRow: row,
        });

        newBatch.generatedCertificates = generatedCertPaths.length;
        await newBatch.save();
        console.log(`[Batch ${newBatch._id}] Generated certificate for ${recipientName}. Progress: ${newBatch.generatedCertificates}/${newBatch.totalCertificates}`);

      } catch (certError: any) {
        console.error(`Error generating certificate for row ${i + 1} (data: ${JSON.stringify(row)}):`, certError);
      }
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `certificates_batch_${newBatch._id}.zip`;
    const outputZipPath = path.join(batchOutputDir, zipFileName);
    const output = fs.createWriteStream(outputZipPath);

    archive.pipe(output);

    for (const cert of generatedCertPaths) {
        const absPdfPath = path.join(__dirname, '../../', cert.pdfPath);
        if (fs.existsSync(absPdfPath)) {
            archive.file(absPdfPath, { name: path.basename(cert.pdfPath) });
        } else {
            console.warn(`[Batch ${newBatch._id}] Missing PDF file for ${cert.recipientName} at ${cert.pdfPath}. Skipping from zip.`);
        }
    }
    await archive.finalize();

    newBatch.batchZipPath = path.relative(path.join(__dirname, '../../'), outputZipPath);
    newBatch.status = 'completed';
    newBatch.individualCertificates = generatedCertPaths;
    await newBatch.save();
    console.log(`[Batch ${newBatch._id}] All certificates processed and zipped.`);

  } catch (error: any) {
    console.error('Critical error during batch generation:', error);
    if (newBatch) {
        newBatch.status = 'failed';
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
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to batch status.' });
        }
        res.status(200).json({ status: batch.status, generated: batch.generatedCertificates, total: batch.totalCertificates });
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
        const batch = await CertificateBatch.findById(req.params.batchId).populate('templateId');
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to batch details.' });
        }

        const individualDownloads = batch.individualCertificates.map(cert => ({
            recipientName: cert.recipientName,
            downloadUrl: `${req.protocol}://${req.get('host')}/${cert.pdfPath.replace(/\\/g, '/')}`
        }));

        const batchZipDownloadUrl = batch.batchZipPath ?
            `${req.protocol}://${req.get('host')}/${batch.batchZipPath.replace(/\\/g, '/')}` :
            null;

        res.status(200).json({
            _id: batch._id,
            templateName: (batch.templateId as any)?.name || 'Unknown Template',
            status: batch.status,
            totalCertificates: batch.totalCertificates,
            generatedCertificates: batch.generatedCertificates,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
            individualDownloads,
            batchZipDownloadUrl,
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
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to this batch.' });
        }
        if (batch.status !== 'completed' || !batch.batchZipPath) {
            return res.status(400).json({ message: 'Batch is not yet completed or zip file is not available.' });
        }

        const filePath = path.join(__dirname, '../../', batch.batchZipPath);
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
        if (isNaN(index)) { // Added check for valid index
            return res.status(400).json({ message: 'Invalid certificate index.' });
        }

        const batch = await CertificateBatch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to this batch.' });
        }
        if (batch.status !== 'completed' || index < 0 || index >= batch.individualCertificates.length) {
            return res.status(400).json({ message: 'Certificate not available or invalid index.' });
        }

        const certInfo = batch.individualCertificates[index];
        const filePath = path.join(__dirname, '../../', certInfo.pdfPath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Individual certificate file not found on server.' });
        }

        res.download(filePath, `${certInfo.recipientName || `certificate-${index + 1}`}.pdf`, (err) => {
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