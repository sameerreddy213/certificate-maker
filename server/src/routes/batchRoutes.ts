import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import {
  getBatches,
  startBatchGeneration,
  getBatchStatus,
  getBatchDetails,
  downloadBatchZip,
  downloadIndividualCertificate,
} from '../controllers/batchController';

const router = express.Router();

router.route('/').get(protect, getBatches);
router.route('/generate').post(protect, upload.single('dataFile'), startBatchGeneration);
router.route('/:batchId/status').get(protect, getBatchStatus);
router.route('/:batchId/details').get(protect, getBatchDetails);
router.route('/:batchId/download-zip').get(protect, downloadBatchZip);
router.route('/:batchId/download-certificate/:certIndex').get(protect, downloadIndividualCertificate);

export default router;