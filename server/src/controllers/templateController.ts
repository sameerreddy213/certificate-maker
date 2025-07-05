// server/src/controllers/templateController.ts
import { Response } from 'express'; // Only need Response directly now
import CertificateTemplate from '../models/CertificateTemplate';
import { AuthenticatedRequest } from '../middleware/authMiddleware'; // Correctly import AuthenticatedRequest
import fs from 'fs'; // Node.js file system module
import path from 'path';

// Define a custom Request type to include `file` from multer,
// and inherit `body`, `params`, `query`, `user` from AuthenticatedRequest
interface TemplateRequest extends AuthenticatedRequest {
  file?: Express.Multer.File; // Add the file property from multer
}

// @desc    Create a new certificate template
// @route   POST /api/templates
// @access  Private
export const createTemplate = async (req: TemplateRequest, res: Response) => {
  try {
    // req.body, req.file, req.user are now correctly typed due to interface extension
    const { name, description, template_type, placeholders: placeholdersJson } = req.body;
    const templateFile = req.file;

    if (!templateFile) {
      return res.status(400).json({ message: 'Template file is required.' });
    }
    if (!name || !template_type || !placeholdersJson) {
        // If template_file was uploaded but other required fields are missing, delete the file
        if (templateFile && fs.existsSync(templateFile.path)) {
            fs.unlinkSync(templateFile.path);
        }
        return res.status(400).json({ message: 'Please provide template name, type, and placeholders.' });
    }

    // Parse placeholders from JSON string (sent as JSON.stringify from frontend)
    let placeholders: string[] = [];
    try {
      placeholders = JSON.parse(placeholdersJson);
      if (!Array.isArray(placeholders)) {
        throw new Error('Placeholders must be an array.');
      }
    } catch (parseError) {
        if (templateFile && fs.existsSync(templateFile.path)) {
            fs.unlinkSync(templateFile.path);
        }
        return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
    }

    const newTemplate = new CertificateTemplate({
      name,
      description,
      templateFilePath: templateFile.path, // Store the full path where multer saved the file
      templateType: template_type,
      placeholders,
      owner: req.user?.id, // Use optional chaining for req.user just in case, though protect middleware should ensure it
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error: any) {
    console.error('Error creating template:', error);
    // If an error occurs during saving, clean up the uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get all templates for the authenticated user
// @route   GET /api/templates
// @access  Private
export const getTemplates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await CertificateTemplate.find({ owner: req.user?.id }).select('-templateFilePath'); // Don't send file path to client
    res.status(200).json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get a single template by ID
// @route   GET /api/templates/:id
// @access  Private (only if owner matches)
export const getTemplateById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = await CertificateTemplate.findOne({ _id: req.params.id, owner: req.user?.id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found or you do not have access.' });
    }
    res.status(200).json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update a template
// @route   PUT /api/templates/:id
// @access  Private
export const updateTemplate = async (req: TemplateRequest, res: Response) => {
  try {
    const { name, description, template_type, placeholders: placeholdersJson } = req.body;
    const templateFile = req.file;

    const existingTemplate = await CertificateTemplate.findById(req.params.id);
    if (!existingTemplate || String(existingTemplate.owner) !== String(req.user?.id)) {
      if (templateFile) fs.unlinkSync(templateFile.path); // Clean up if not authorized
      return res.status(404).json({ message: 'Template not found or you do not have access.' });
    }

    // Prepare update fields
    const updateFields: any = { name, description, templateType: template_type };
    if (placeholdersJson) {
      try {
        updateFields.placeholders = JSON.parse(placeholdersJson);
        if (!Array.isArray(updateFields.placeholders)) {
            throw new Error('Placeholders must be an array.');
        }
      } catch (parseError) {
          if (templateFile) fs.unlinkSync(templateFile.path);
          return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
      }
    }

    if (templateFile) {
      // Delete old file if a new one is uploaded
      if (existingTemplate.templateFilePath && fs.existsSync(existingTemplate.templateFilePath)) {
        fs.unlinkSync(existingTemplate.templateFilePath);
      }
      updateFields.templateFilePath = templateFile.path;
    }

    const updatedTemplate = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    ).select('-templateFilePath');

    res.status(200).json(updatedTemplate);
  } catch (error: any) {
    console.error('Error updating template:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Delete a template
// @route   DELETE /api/templates/:id
// @access  Private
export const deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = await CertificateTemplate.findOne({ _id: req.params.id, owner: req.user?.id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found or you do not have access.' });
    }

    // Delete the physical file from the server
    if (template.templateFilePath && fs.existsSync(template.templateFilePath)) {
      fs.unlinkSync(template.templateFilePath);
    }

    await template.deleteOne(); // Use deleteOne() for Mongoose 5.x+
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};