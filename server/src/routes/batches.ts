import { Router } from 'express';
import { getBatches, createBatch } from '../controllers/batchController';
import { protect } from '../middleware/authMiddleware'; // Import protect

const router = Router();

router.route('/').get(protect, getBatches).post(protect, createBatch);

export default router;