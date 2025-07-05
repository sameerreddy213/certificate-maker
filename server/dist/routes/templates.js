"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/templates.ts
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming this middleware exists for authentication
const templateController_1 = require("../controllers/templateController");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs")); // Node.js file system module
const router = (0, express_1.Router)();
// Configure multer storage for template files
const templateStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads/templates');
        // Ensure the upload directory exists
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename using timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
});
// Filter to allow only DOCX and PPTX files
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only DOCX and PPTX files are allowed.'));
    }
};
const uploadTemplate = (0, multer_1.default)({ storage: templateStorage, fileFilter: fileFilter });
router.route('/')
    .post(authMiddleware_1.protect, uploadTemplate.single('template_file'), templateController_1.createTemplate) // 'template_file' is the field name from the frontend FormData
    .get(authMiddleware_1.protect, templateController_1.getTemplates);
router.route('/:id')
    .get(authMiddleware_1.protect, templateController_1.getTemplateById)
    .put(authMiddleware_1.protect, uploadTemplate.single('template_file'), templateController_1.updateTemplate) // Allow updating template file
    .delete(authMiddleware_1.protect, templateController_1.deleteTemplate);
exports.default = router;
