"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/batches.ts
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Import AuthenticatedRequest
const batchController_1 = require("../controllers/batchController");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const dataStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads/data');
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const uploadData = (0, multer_1.default)({
    storage: dataStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed for data input.'), false);
        }
    },
});
// Route to initiate batch certificate generation
router.post('/generate', authMiddleware_1.protect, uploadData.single('dataFile'), 
// Fix: Cast the controller function to 'unknown' first, then to AuthenticatedRequestHandler
batchController_1.generateCertificatesBatch);
// Routes for fetching batch status and downloading results
// Apply the same two-step cast to ensure TypeScript correctly infers 'req.user'
router.get('/:batchId/status', authMiddleware_1.protect, batchController_1.getBatchStatus);
router.get('/:batchId/details', authMiddleware_1.protect, batchController_1.getBatchDetails);
router.get('/:batchId/download-zip', authMiddleware_1.protect, batchController_1.downloadBatchZip);
router.get('/:batchId/download-certificate/:certIndex', authMiddleware_1.protect, batchController_1.downloadIndividualCertificate);
exports.default = router;
