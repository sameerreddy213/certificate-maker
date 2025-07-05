import { Router } from 'express';
import { getTemplates, createTemplate } from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware'; // Import the middleware

const router = Router();

// Apply the 'protect' middleware to both routes
router.route('/').get(protect, getTemplates).post(protect, createTemplate);

export default router;