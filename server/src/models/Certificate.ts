import { Schema, model, Document } from 'mongoose';

export interface ICertificate extends Document {
  userId: Schema.Types.ObjectId;
  batchId: Schema.Types.ObjectId;
  recipient_name: string;
  recipient_email?: string;
  certificate_data: object;
  status: 'pending' | 'generated' | 'failed';
  certificate_url?: string;
  error_message?: string;
}

const CertificateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'CertificateBatch', required: true },
  recipient_name: { type: String, required: true },
  recipient_email: { type: String },
  certificate_data: { type: Object, required: true },
  status: { type: String, default: 'pending' },
  certificate_url: { type: String },
  error_message: { type: String },
}, { timestamps: true });

export default model<ICertificate>('Certificate', CertificateSchema);