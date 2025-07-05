import { Schema, model, Document } from 'mongoose';

export interface ICertificateTemplate extends Document {
  userId: Schema.Types.ObjectId; // Add this
  name: string;
  description: string;
  template_type: string;
  template_content: string;
  placeholders: string[];
  is_active: boolean;
}

const CertificateTemplateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Add this
  name: { type: String, required: true },
  description: { type: String },
  template_type: { type: String, required: true, default: 'html' },
  template_content: { type: String },
  placeholders: { type: [String], default: [] },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default model<ICertificateTemplate>('CertificateTemplate', CertificateTemplateSchema);