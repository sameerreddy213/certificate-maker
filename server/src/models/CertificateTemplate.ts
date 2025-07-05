// server/src/models/CertificateTemplate.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificateTemplate extends Document {
  name: string;
  description?: string;
  templateFilePath: string; // Stores the local path where the template file is saved
  templateType: 'docx' | 'pptx'; // Stores the type of the template file
  placeholders: string[]; // Stores the list of placeholders defined by the user
  owner: mongoose.Schema.Types.ObjectId; // Link to the user who uploaded the template
  createdAt: Date;
  updatedAt: Date;
}

const CertificateTemplateSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  templateFilePath: { type: String, required: true },
  templateType: { type: String, enum: ['docx', 'pptx'], required: true },
  placeholders: [{ type: String }], // Array of strings
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Assumes a User model exists
}, { timestamps: true });

export default mongoose.model<ICertificateTemplate>('CertificateTemplate', CertificateTemplateSchema);