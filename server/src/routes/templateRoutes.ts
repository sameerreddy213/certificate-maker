// server/src/routes/templateRoutes.ts
import express from 'express';
import {
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate
} from '../controllers/templateController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Apply the 'protect' middleware to all routes in this file
router.use(protect);

router.route('/')
    .post(upload.single('templateFile'), createTemplate)
    .get(getTemplates);

router.route('/:id')
    .get(getTemplateById)
    .put(upload.single('templateFile'), updateTemplate)
    .delete(deleteTemplate);

export default router;