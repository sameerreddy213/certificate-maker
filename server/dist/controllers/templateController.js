"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTemplate = exports.updateTemplate = exports.getTemplateById = exports.getTemplates = exports.createTemplate = void 0;
const CertificateTemplate_1 = __importDefault(require("../models/CertificateTemplate"));
const fs_1 = __importDefault(require("fs")); // Node.js file system module
// @desc    Create a new certificate template
// @route   POST /api/templates
// @access  Private
const createTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // req.body, req.file, req.user are now correctly typed due to interface extension
        const { name, description, template_type, placeholders: placeholdersJson } = req.body;
        const templateFile = req.file;
        if (!templateFile) {
            return res.status(400).json({ message: 'Template file is required.' });
        }
        if (!name || !template_type || !placeholdersJson) {
            // If template_file was uploaded but other required fields are missing, delete the file
            if (templateFile && fs_1.default.existsSync(templateFile.path)) {
                fs_1.default.unlinkSync(templateFile.path);
            }
            return res.status(400).json({ message: 'Please provide template name, type, and placeholders.' });
        }
        // Parse placeholders from JSON string (sent as JSON.stringify from frontend)
        let placeholders = [];
        try {
            placeholders = JSON.parse(placeholdersJson);
            if (!Array.isArray(placeholders)) {
                throw new Error('Placeholders must be an array.');
            }
        }
        catch (parseError) {
            if (templateFile && fs_1.default.existsSync(templateFile.path)) {
                fs_1.default.unlinkSync(templateFile.path);
            }
            return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
        }
        const newTemplate = new CertificateTemplate_1.default({
            name,
            description,
            templateFilePath: templateFile.path, // Store the full path where multer saved the file
            templateType: template_type,
            placeholders,
            owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, // Use optional chaining for req.user just in case, though protect middleware should ensure it
        });
        const savedTemplate = yield newTemplate.save();
        res.status(201).json(savedTemplate);
    }
    catch (error) {
        console.error('Error creating template:', error);
        // If an error occurs during saving, clean up the uploaded file if it exists
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.createTemplate = createTemplate;
// @desc    Get all templates for the authenticated user
// @route   GET /api/templates
// @access  Private
const getTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const templates = yield CertificateTemplate_1.default.find({ owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }).select('-templateFilePath'); // Don't send file path to client
        res.status(200).json(templates);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getTemplates = getTemplates;
// @desc    Get a single template by ID
// @route   GET /api/templates/:id
// @access  Private (only if owner matches)
const getTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const template = yield CertificateTemplate_1.default.findOne({ _id: req.params.id, owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        if (!template) {
            return res.status(404).json({ message: 'Template not found or you do not have access.' });
        }
        res.status(200).json(template);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getTemplateById = getTemplateById;
// @desc    Update a template
// @route   PUT /api/templates/:id
// @access  Private
const updateTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, template_type, placeholders: placeholdersJson } = req.body;
        const templateFile = req.file;
        const existingTemplate = yield CertificateTemplate_1.default.findById(req.params.id);
        if (!existingTemplate || String(existingTemplate.owner) !== String((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            if (templateFile)
                fs_1.default.unlinkSync(templateFile.path); // Clean up if not authorized
            return res.status(404).json({ message: 'Template not found or you do not have access.' });
        }
        // Prepare update fields
        const updateFields = { name, description, templateType: template_type };
        if (placeholdersJson) {
            try {
                updateFields.placeholders = JSON.parse(placeholdersJson);
                if (!Array.isArray(updateFields.placeholders)) {
                    throw new Error('Placeholders must be an array.');
                }
            }
            catch (parseError) {
                if (templateFile)
                    fs_1.default.unlinkSync(templateFile.path);
                return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
            }
        }
        if (templateFile) {
            // Delete old file if a new one is uploaded
            if (existingTemplate.templateFilePath && fs_1.default.existsSync(existingTemplate.templateFilePath)) {
                fs_1.default.unlinkSync(existingTemplate.templateFilePath);
            }
            updateFields.templateFilePath = templateFile.path;
        }
        const updatedTemplate = yield CertificateTemplate_1.default.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true, runValidators: true } // Return the updated document and run schema validators
        ).select('-templateFilePath');
        res.status(200).json(updatedTemplate);
    }
    catch (error) {
        console.error('Error updating template:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updateTemplate = updateTemplate;
// @desc    Delete a template
// @route   DELETE /api/templates/:id
// @access  Private
const deleteTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const template = yield CertificateTemplate_1.default.findOne({ _id: req.params.id, owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        if (!template) {
            return res.status(404).json({ message: 'Template not found or you do not have access.' });
        }
        // Delete the physical file from the server
        if (template.templateFilePath && fs_1.default.existsSync(template.templateFilePath)) {
            fs_1.default.unlinkSync(template.templateFilePath);
        }
        yield template.deleteOne(); // Use deleteOne() for Mongoose 5.x+
        res.status(200).json({ message: 'Template deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.deleteTemplate = deleteTemplate;
