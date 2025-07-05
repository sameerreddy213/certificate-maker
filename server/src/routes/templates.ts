import { Router } from 'express';
import { getTemplates, createTemplate, deleteTemplate } from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
    .get(protect, getTemplates)
    .post(protect, createTemplate);

// Add this line for deleting a specific template
router.route('/:id')
    .delete(protect, deleteTemplate);

export default router;