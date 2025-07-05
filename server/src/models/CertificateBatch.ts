import { Schema, model, Document } from 'mongoose';

export interface ICertificateBatch extends Document {
  userId: Schema.Types.ObjectId; // Add this
  batch_name: string;
  template_id: string;
  total_certificates: number;
  generated_certificates: number;
  status: string;
}

const CertificateBatchSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Add this
    batch_name: { type: String, required: true },
    template_id: { type: Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
    total_certificates: { type: Number, default: 0 },
    generated_certificates: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
}, { timestamps: true });

export default model<ICertificateBatch>('CertificateBatch', CertificateBatchSchema);