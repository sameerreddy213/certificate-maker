"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CertificateTemplateSchema = new mongoose_1.Schema({
    // Add the userId field, make it required, and link it to the User model
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    template_type: { type: String, required: true, default: 'html' },
    template_content: { type: String },
    placeholders: { type: [String], default: [] },
    is_active: { type: Boolean, default: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('CertificateTemplate', CertificateTemplateSchema);
