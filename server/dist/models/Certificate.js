"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CertificateSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CertificateBatch', required: true },
    recipient_name: { type: String, required: true },
    recipient_email: { type: String },
    certificate_data: { type: Object, required: true },
    status: { type: String, default: 'pending' },
    certificate_url: { type: String },
    error_message: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Certificate', CertificateSchema);
