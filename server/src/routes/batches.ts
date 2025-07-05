import { Router } from 'express';
import { getBatches, createBatch, getCertificatesForBatch } from '../controllers/batchController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
    .get(protect, getBatches)
    .post(protect, createBatch);

router.route('/:id/certificates')
    .get(protect, getCertificatesForBatch);

export default router;