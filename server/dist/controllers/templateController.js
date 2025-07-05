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
exports.deleteTemplate = exports.createTemplate = exports.getTemplates = void 0;
const CertificateTemplate_1 = __importDefault(require("../models/CertificateTemplate"));
// Get templates ONLY for the logged-in user
const getTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const templates = yield CertificateTemplate_1.default.find({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }).sort({ createdAt: -1 });
        res.json(templates);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching templates' });
    }
});
exports.getTemplates = getTemplates;
// Create a template and associate it with the logged-in user
const createTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const newTemplate = new CertificateTemplate_1.default(Object.assign(Object.assign({}, req.body), { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }));
        yield newTemplate.save();
        res.status(201).json(newTemplate);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating template' });
    }
});
exports.createTemplate = createTemplate;
// Delete a template belonging to the logged-in user
const deleteTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Find the template by its ID and ensure it belongs to the authenticated user
        const template = yield CertificateTemplate_1.default.findOne({ _id: req.params.id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        if (!template) {
            // If no template is found, return a 404 error
            return res.status(404).json({ message: 'Template not found' });
        }
        // Use the deleteOne method on the document
        yield template.deleteOne();
        res.json({ message: 'Template removed' });
    }
    catch (error) {
        // Handle potential errors during the deletion process
        res.status(500).json({ message: 'Error deleting template' });
    }
});
exports.deleteTemplate = deleteTemplate;
