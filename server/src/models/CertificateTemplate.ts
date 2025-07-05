// Path: sameerreddy213/certificate-maker/certificate-maker-38a71d2e924d8ea6a1c43ab9a2b6890be916c91b/server/src/models/CertificateTemplate.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for the CertificateTemplate document
export interface ICertificateTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string; // Optional field
  template_type: 'html' | 'docx' | 'pptx'; // Enforce specific types
  template_content: string;
  placeholders: string[]; // Array of strings to store placeholders
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema for the CertificateTemplate
const CertificateTemplateSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true // userId is mandatory for each template
  },
  name: {
    type: String,
    required: true, // Template name is mandatory
    trim: true // Remove whitespace from both ends of a string
  },
  description: {
    type: String,
    trim: true
  },
  template_type: {
    type: String,
    enum: ['html', 'docx', 'pptx'], // Restrict template_type to these specific values
    required: true
  },
  template_content: {
    type: String,
    required: true // Template content (e.g., HTML string) is mandatory
  },
  placeholders: {
    type: [String], // Array of strings for dynamic placeholders
    default: [] // Default to an empty array if no placeholders are provided
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Create and export the Mongoose model
const CertificateTemplate = mongoose.model<ICertificateTemplate>('CertificateTemplate', CertificateTemplateSchema);

export default CertificateTemplate;