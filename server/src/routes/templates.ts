import { Router } from 'express';
import { getTemplates, createTemplate } from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware'; // Import protect

const router = Router();

router.route('/').get(protect, getTemplates).post(protect, createTemplate);

export default router;