import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificateBatch extends Document {
  template_id: mongoose.Schema.Types.ObjectId;
  user_id: mongoose.Schema.Types.ObjectId;
  batch_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_certificates: number;
  generated_certificates: number;
  batch_zip_url?: string;
  error_message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateBatchSchema: Schema = new Schema({
  template_id: { type: Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  batch_name: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  total_certificates: { type: Number, default: 0 },
  generated_certificates: { type: Number, default: 0 },
  batch_zip_url: { type: String },
  error_message: { type: String },
}, { timestamps: true });

export default mongoose.model<ICertificateBatch>('CertificateBatch', CertificateBatchSchema);