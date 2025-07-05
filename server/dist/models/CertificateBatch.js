"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CertificateBatchSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this
    batch_name: { type: String, required: true },
    template_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
    total_certificates: { type: Number, default: 0 },
    generated_certificates: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('CertificateBatch', CertificateBatchSchema);
