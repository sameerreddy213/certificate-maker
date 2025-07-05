// server/src/controllers/templateController.ts
import { Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import fs from 'fs/promises'; // Changed to fs/promises for async file operations
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
  const templateFile = req.file;

  try {
    const { name, description, template_type, placeholders: placeholdersJson } = req.body;

    if (!templateFile) {
      return res.status(400).json({ message: 'Template file is required.' });
    }
    if (!name || !template_type || !placeholdersJson) {
      // If template_file was uploaded but other required fields are missing, delete the file
      if (templateFile) {
        try {
          await fs.unlink(templateFile.path);
        } catch (unlinkError: any) {
          console.error(`Failed to clean up uploaded file: ${templateFile.path}`, unlinkError.message);
        }
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
      if (templateFile) {
        try {
          await fs.unlink(templateFile.path); // Clean up if parse error
        } catch (unlinkError: any) {
          console.error(`Failed to clean up uploaded file after parse error: ${templateFile.path}`, unlinkError.message);
        }
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
    if (templateFile) {
      try {
        await fs.unlink(templateFile.path);
      } catch (unlinkError: any) {
        console.error(`Failed to clean up uploaded file after server error: ${templateFile.path}`, unlinkError.message);
      }
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
  const templateFile = req.file;

  try {
    const { name, description, template_type, placeholders: placeholdersJson } = req.body;

    const existingTemplate = await CertificateTemplate.findById(req.params.id);
    if (!existingTemplate || String(existingTemplate.owner) !== String(req.user?.id)) {
      if (templateFile) {
        try {
          await fs.unlink(templateFile.path); // Clean up if not authorized
        } catch (unlinkError: any) {
          console.error(`Failed to clean up uploaded file for unauthorized update: ${templateFile.path}`, unlinkError.message);
        }
      }
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
        if (templateFile) {
          try {
            await fs.unlink(templateFile.path); // Clean up if parse error
          } catch (unlinkError: any) {
            console.error(`Failed to clean up uploaded file after parse error during update: ${templateFile.path}`, unlinkError.message);
          }
        }
        return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
      }
    }

    if (templateFile) {
      // Delete old file if a new one is uploaded
      if (existingTemplate.templateFilePath) {
        try {
          await fs.unlink(existingTemplate.templateFilePath);
        } catch (fileError: any) {
          console.warn(`Could not delete old template file during update, it may already be removed or path is invalid: ${existingTemplate.templateFilePath}`, fileError.message);
        }
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
    if (templateFile) {
      try {
        await fs.unlink(templateFile.path); // Clean up new uploaded file on error
      } catch (unlinkError: any) {
        console.error(`Failed to clean up new uploaded file after update error: ${templateFile.path}`, unlinkError.message);
      }
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Delete a certificate template
 * @route   DELETE /api/templates/:id
 * @access  Private
 */
export const deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
  console.log(`[DELETE] Received request to delete template ID: ${req.params.id}`);

  if (!req.user) {
    console.log('[DELETE] FAILED: User not authenticated.');
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      console.log(`[DELETE] FAILED: Template with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: 'Template not found' });
    }
    console.log(`[DELETE] Found template: ${template.name}, owned by: ${template.owner}`);

    // Ensure the user owns the template before deleting
    // Use .toString() for comparison with req.user.id which is a string
    if (template.owner.toString() !== req.user.id) {
      console.log(`[DELETE] FAILED: User ${req.user.id} does not own template (owner is ${template.owner}).`);
      return res.status(401).json({ message: 'User not authorized' });
    }
    console.log('[DELETE] User ownership confirmed.');

    // Delete the physical file from the server
    // Construct the file path using path.join for cross-platform compatibility
    // Assuming `template.templateFilePath` is relative to the project root or a known base directory
    // If it's already an absolute path, path.join will handle it correctly (the absolute part will dominate)
    const filePath = path.join(__dirname, '../../', template.templateFilePath);
    console.log(`[DELETE] Attempting to delete file at: ${filePath}`);
    try {
      await fs.unlink(filePath);
      console.log('[DELETE] Successfully deleted physical file.');
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        console.warn(`[DELETE] Template file not found at ${filePath}, it may have been already deleted. Continuing...`);
      } else {
        console.error(`[DELETE] Error deleting physical file at ${filePath}:`, fileError);
        throw fileError; // Re-throw other file errors
      }
    }

    // Remove the template from the database
    console.log('[DELETE] Attempting to delete template from database.');
    await template.deleteOne();
    console.log('[DELETE] Successfully deleted template from database.');

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE] CRITICAL ERROR during template deletion:', error);
    res.status(500).json({ message: 'Server error while deleting template' });
  }
};