"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadIndividualCertificate = exports.downloadBatchZip = exports.getBatchDetails = exports.getBatchStatus = exports.generateCertificatesBatch = void 0;
const CertificateTemplate_1 = __importDefault(require("../models/CertificateTemplate"));
const CertificateBatch_1 = __importDefault(require("../models/CertificateBatch"));
const documentProcessor_1 = require("../services/documentProcessor");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const archiver_1 = __importDefault(require("archiver"));
const fs_2 = require("fs");
// @desc    Initiate batch certificate generation
// @route   POST /api/batches/generate
// @access  Private
const generateCertificatesBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // --- START FIX: Explicitly check req.user and assign to a guaranteed local variable ---
    if (!req.user || !req.user.id) { // Check both req.user and req.user.id for extra robustness
        return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
    }
    // Convert req.user.id to a string and explicitly type it to overcome TS strictness
    const userId = String(req.user.id);
    // --- END FIX ---
    let newBatch = null;
    let batchOutputDir = null;
    const dataFile = req.file;
    const { templateId, mappings: mappingsJson } = req.body;
    if (!dataFile) {
        return res.status(400).json({ message: 'Data file (Excel/CSV) is required.' });
    }
    if (!templateId || !mappingsJson) {
        if (dataFile && fs_1.default.existsSync(dataFile.path)) {
            fs_1.default.unlinkSync(dataFile.path);
        }
        return res.status(400).json({ message: 'Template ID and column mappings are required.' });
    }
    try {
        const template = yield CertificateTemplate_1.default.findById(templateId);
        if (!template) {
            if (dataFile && fs_1.default.existsSync(dataFile.path)) {
                fs_1.default.unlinkSync(dataFile.path);
            }
            return res.status(404).json({ message: 'Selected template not found.' });
        }
        const mappings = JSON.parse(mappingsJson);
        const workbook = xlsx_1.default.readFile(dataFile.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const dataRows = xlsx_1.default.utils.sheet_to_json(sheet);
        if (dataRows.length === 0) {
            if (dataFile && fs_1.default.existsSync(dataFile.path)) {
                fs_1.default.unlinkSync(dataFile.path);
            }
            return res.status(400).json({ message: 'The uploaded data file is empty.' });
        }
        batchOutputDir = path_1.default.join(__dirname, '../../generated_certificates', String(new Date().getTime()));
        yield fs_2.promises.mkdir(batchOutputDir, { recursive: true });
        newBatch = new CertificateBatch_1.default({
            templateId: template._id,
            owner: userId, // Use the guaranteed userId
            status: 'pending',
            totalCertificates: dataRows.length,
            generatedCertificates: 0,
            individualCertificates: [],
        });
        yield newBatch.save();
        res.status(202).json({
            message: 'Certificate generation started. Check batch status for updates.',
            batchId: newBatch._id,
        });
        newBatch.status = 'processing';
        yield newBatch.save();
        console.log(`[Batch ${newBatch._id}] Starting generation of ${dataRows.length} certificates.`);
        const generatedCertPaths = [];
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            try {
                const certificateData = {};
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
                const tempDocxPath = path_1.default.join(batchOutputDir, `${uniqueFileName}.docx`);
                const finalPdfPath = path_1.default.join(batchOutputDir, `${uniqueFileName}.pdf`);
                yield (0, documentProcessor_1.generateDocxWithData)(template.templateFilePath, certificateData, tempDocxPath);
                yield (0, documentProcessor_1.convertDocxToPdf)(tempDocxPath, finalPdfPath);
                yield fs_2.promises.unlink(tempDocxPath);
                generatedCertPaths.push({
                    recipientName,
                    pdfPath: path_1.default.relative(path_1.default.join(__dirname, '../../'), finalPdfPath),
                    originalDataRow: row,
                });
                newBatch.generatedCertificates = generatedCertPaths.length;
                yield newBatch.save();
                console.log(`[Batch ${newBatch._id}] Generated certificate for ${recipientName}. Progress: ${newBatch.generatedCertificates}/${newBatch.totalCertificates}`);
            }
            catch (certError) {
                console.error(`Error generating certificate for row ${i + 1} (data: ${JSON.stringify(row)}):`, certError);
            }
        }
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const zipFileName = `certificates_batch_${newBatch._id}.zip`;
        const outputZipPath = path_1.default.join(batchOutputDir, zipFileName);
        const output = fs_1.default.createWriteStream(outputZipPath);
        archive.pipe(output);
        for (const cert of generatedCertPaths) {
            const absPdfPath = path_1.default.join(__dirname, '../../', cert.pdfPath);
            if (fs_1.default.existsSync(absPdfPath)) {
                archive.file(absPdfPath, { name: path_1.default.basename(cert.pdfPath) });
            }
            else {
                console.warn(`[Batch ${newBatch._id}] Missing PDF file for ${cert.recipientName} at ${cert.pdfPath}. Skipping from zip.`);
            }
        }
        yield archive.finalize();
        newBatch.batchZipPath = path_1.default.relative(path_1.default.join(__dirname, '../../'), outputZipPath);
        newBatch.status = 'completed';
        newBatch.individualCertificates = generatedCertPaths;
        yield newBatch.save();
        console.log(`[Batch ${newBatch._id}] All certificates processed and zipped.`);
    }
    catch (error) {
        console.error('Critical error during batch generation:', error);
        if (newBatch) {
            newBatch.status = 'failed';
            yield newBatch.save();
        }
        if (dataFile && fs_1.default.existsSync(dataFile.path)) {
            fs_1.default.unlinkSync(dataFile.path);
        }
        if (batchOutputDir && fs_1.default.existsSync(batchOutputDir)) {
            yield fs_2.promises.rm(batchOutputDir, { recursive: true, force: true });
        }
    }
});
exports.generateCertificatesBatch = generateCertificatesBatch;
// @desc    Get status of a specific batch generation
// @route   GET /api/batches/:batchId/status
// @access  Private
const getBatchStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId = String(req.user.id);
    try {
        const batch = yield CertificateBatch_1.default.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to batch status.' });
        }
        res.status(200).json({ status: batch.status, generated: batch.generatedCertificates, total: batch.totalCertificates });
    }
    catch (error) {
        console.error('Error fetching batch status:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getBatchStatus = getBatchStatus;
// @desc    Get details of a specific batch (including individual certificate links)
// @route   GET /api/batches/:batchId/details
// @access  Private
const getBatchDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId = String(req.user.id);
    try {
        const batch = yield CertificateBatch_1.default.findById(req.params.batchId).populate('templateId');
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
            templateName: ((_a = batch.templateId) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Template',
            status: batch.status,
            totalCertificates: batch.totalCertificates,
            generatedCertificates: batch.generatedCertificates,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
            individualDownloads,
            batchZipDownloadUrl,
        });
    }
    catch (error) {
        console.error('Error fetching batch details:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getBatchDetails = getBatchDetails;
// @desc    Download the zipped batch of certificates
// @route   GET /api/batches/:batchId/download-zip
// @access  Private
const downloadBatchZip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId = String(req.user.id);
    try {
        const batch = yield CertificateBatch_1.default.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (String(batch.owner) !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized access to this batch.' });
        }
        if (batch.status !== 'completed' || !batch.batchZipPath) {
            return res.status(400).json({ message: 'Batch is not yet completed or zip file is not available.' });
        }
        const filePath = path_1.default.join(__dirname, '../../', batch.batchZipPath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: 'Zip file not found on server.' });
        }
        res.download(filePath, `certificates_batch_${batch._id}.zip`, (err) => {
            if (err) {
                console.error('Error downloading batch zip:', err);
                res.status(500).json({ message: 'Failed to download zip file.' });
            }
        });
    }
    catch (error) {
        console.error('Error in downloadBatchZip:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.downloadBatchZip = downloadBatchZip;
// @desc    Download a single certificate from a batch
// @route   GET /api/batches/:batchId/download-certificate/:certIndex
// @access  Private
const downloadIndividualCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const userId = String(req.user.id);
    try {
        const { batchId, certIndex } = req.params;
        const index = parseInt(certIndex !== null && certIndex !== void 0 ? certIndex : '', 10);
        if (isNaN(index)) { // Added check for valid index
            return res.status(400).json({ message: 'Invalid certificate index.' });
        }
        const batch = yield CertificateBatch_1.default.findById(batchId);
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
        const filePath = path_1.default.join(__dirname, '../../', certInfo.pdfPath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: 'Individual certificate file not found on server.' });
        }
        res.download(filePath, `${certInfo.recipientName || `certificate-${index + 1}`}.pdf`, (err) => {
            if (err) {
                console.error('Error downloading individual certificate:', err);
                res.status(500).json({ message: 'Failed to download certificate file.' });
            }
        });
    }
    catch (error) {
        console.error('Error in downloadIndividualCertificate:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.downloadIndividualCertificate = downloadIndividualCertificate;
