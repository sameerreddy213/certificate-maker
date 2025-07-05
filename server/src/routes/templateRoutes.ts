import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import {
  createTemplate,
  getTemplates,
  deleteTemplate,
} from '../controllers/templateController';

const router = express.Router();

router
  .route('/')
  .get(protect, getTemplates)
  .post(protect, upload.single('template_file'), createTemplate);

router.route('/:id').delete(protect, deleteTemplate);

export default router;