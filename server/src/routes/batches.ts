// server/src/routes/batches.ts
import { Router, Request, Response, RequestHandler } from 'express';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware'; // Import AuthenticatedRequest
import { generateCertificatesBatch, getBatchStatus, getBatchDetails, downloadBatchZip, downloadIndividualCertificate } from '../controllers/batchController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const dataStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/data');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadData = multer({
  storage: dataStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed for data input.') as any, false);
    }
  },
});

// Define a type for handlers AFTER 'protect' middleware
// This combines the base RequestHandler with our custom AuthenticatedRequest properties
type AuthenticatedRequestHandler<
  P = import('express-serve-static-core').ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = import('express-serve-static-core').Query,
  Locals extends Record<string, any> = Record<string, any>
> = RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> & {
  user: AuthenticatedRequest['user']; // Explicitly state that 'user' property will be present
};


// Route to initiate batch certificate generation
router.post(
  '/generate',
  protect,
  uploadData.single('dataFile'),
  // Fix: Cast the controller function to 'unknown' first, then to AuthenticatedRequestHandler
  generateCertificatesBatch as unknown as AuthenticatedRequestHandler
);

// Routes for fetching batch status and downloading results
// Apply the same two-step cast to ensure TypeScript correctly infers 'req.user'
router.get('/:batchId/status', protect, getBatchStatus as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/details', protect, getBatchDetails as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/download-zip', protect, downloadBatchZip as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/download-certificate/:certIndex', protect, downloadIndividualCertificate as unknown as AuthenticatedRequestHandler);


export default router;