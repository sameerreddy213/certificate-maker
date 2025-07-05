import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
    downloadIndividualCertificate, 
    viewIndividualCertificate 
} from '../controllers/batchController';

const router = express.Router();

// Use the unique certificate ID (:id) instead of batchId and index
router.route('/:id/download').get(protect, downloadIndividualCertificate);
router.route('/:id/view').get(protect, viewIndividualCertificate);

export default router;