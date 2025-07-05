import { Router, Request, Response, RequestHandler } from 'express';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  startBatchGeneration, // Renamed
  getBatchStatus,
  getBatchDetails,
  downloadBatchZip,
  downloadIndividualCertificate,
  getBatches // New import for the added function
} from '../controllers/batchController';
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

type AuthenticatedRequestHandler<
  P = import('express-serve-static-core').ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = import('express-serve-static-core').Query,
  Locals extends Record<string, any> = Record<string, any>
> = RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> & {
  user: AuthenticatedRequest['user'];
};

router.route('/')
  .get(protect, getBatches as unknown as AuthenticatedRequestHandler); // Added route for fetching all batches

router.post(
  '/generate',
  protect,
  uploadData.single('dataFile'),
  startBatchGeneration as unknown as AuthenticatedRequestHandler // Changed function name
);

router.get('/:batchId/status', protect, getBatchStatus as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/details', protect, getBatchDetails as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/download-zip', protect, downloadBatchZip as unknown as AuthenticatedRequestHandler);
router.get('/:batchId/download-certificate/:certIndex', protect, downloadIndividualCertificate as unknown as AuthenticatedRequestHandler);


export default router;