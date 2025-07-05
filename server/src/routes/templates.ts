// server/src/routes/templates.ts
import { Router } from 'express';
import { protect } from '../middleware/authMiddleware'; // Assuming this middleware exists for authentication
import { createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate } from '../controllers/templateController';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Node.js file system module

const router = Router();

// Configure multer storage for template files
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/templates');
    // Ensure the upload directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Filter to allow only DOCX and PPTX files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only DOCX and PPTX files are allowed.'));
  }
};

const uploadTemplate = multer({ storage: templateStorage, fileFilter: fileFilter });

router.route('/')
  .post(protect, uploadTemplate.single('template_file'), createTemplate) // 'template_file' is the field name from the frontend FormData
  .get(protect, getTemplates);

router.route('/:id')
  .get(protect, getTemplateById)
  .put(protect, uploadTemplate.single('template_file'), updateTemplate) // Allow updating template file
  .delete(protect, deleteTemplate);

export default router;