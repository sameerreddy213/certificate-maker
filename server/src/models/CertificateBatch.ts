// server/src/models/CertificateBatch.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificateBatch extends Document {
  templateId: mongoose.Schema.Types.ObjectId; // Reference to the template used
  owner: mongoose.Schema.Types.ObjectId;      // Reference to the user who initiated the batch
  status: 'pending' | 'processing' | 'completed' | 'failed'; // Current status of the batch
  totalCertificates: number;                  // Total number of certificates in the batch
  generatedCertificates: number;              // Count of successfully generated certificates
  batchZipPath?: string;                      // Path to the final zipped batch file
  individualCertificates: {                   // Array of details for each individual certificate
    recipientName: string;
    pdfPath: string;
    originalDataRow: Record<string, any>; // Store original data for traceability
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CertificateBatchSchema: Schema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  totalCertificates: { type: Number, default: 0 },
  generatedCertificates: { type: Number, default: 0 },
  batchZipPath: { type: String },
  individualCertificates: [{
    recipientName: { type: String, required: true },
    pdfPath: { type: String, required: true },
    originalDataRow: { type: Object, required: true },
  }],
}, { timestamps: true });

export default mongoose.model<ICertificateBatch>('CertificateBatch', CertificateBatchSchema);