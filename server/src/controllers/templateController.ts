// server/src/controllers/templateController.ts
import { Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import fs from 'fs/promises';
import path from 'path';

interface TemplateRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
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
            if (templateFile) {
                try {
                    await fs.unlink(templateFile.path);
                } catch (unlinkError: any) {
                    console.error(`Failed to clean up uploaded file: ${templateFile.path}`, unlinkError.message);
                }
            }
            return res.status(400).json({ message: 'Please provide template name, type, and placeholders.' });
        }

        let placeholders: string[] = [];
        try {
            placeholders = JSON.parse(placeholdersJson);
            if (!Array.isArray(placeholders)) {
                throw new Error('Placeholders must be an array.');
            }
        } catch (parseError) {
            if (templateFile) {
                try {
                    await fs.unlink(templateFile.path);
                } catch (unlinkError: any) {
                    console.error(`Failed to clean up uploaded file after parse error: ${templateFile.path}`, unlinkError.message);
                }
            }
            return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
        }

        const newTemplate = new CertificateTemplate({
            name,
            description,
            templateFilePath: templateFile.path,
            templateType: template_type,
            placeholders,
            owner: req.user?.id,
        });

        const savedTemplate = await newTemplate.save();
        res.status(201).json(savedTemplate);
    } catch (error: any) {
        console.error('Error creating template:', error);
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
        const templates = await CertificateTemplate.find({ owner: req.user?.id }).select('-templateFilePath');
        res.status(200).json(templates);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get a single template by ID
// @route   GET /api/templates/:id
// @access  Private
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
                    await fs.unlink(templateFile.path);
                } catch (unlinkError: any) {
                    console.error(`Failed to clean up uploaded file for unauthorized update: ${templateFile.path}`, unlinkError.message);
                }
            }
            return res.status(404).json({ message: 'Template not found or you do not have access.' });
        }

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
                        await fs.unlink(templateFile.path);
                    } catch (unlinkError: any) {
                        console.error(`Failed to clean up uploaded file after parse error during update: ${templateFile.path}`, unlinkError.message);
                    }
                }
                return res.status(400).json({ message: 'Invalid placeholders format. Must be a JSON array of strings.' });
            }
        }

        if (templateFile) {
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
            { new: true, runValidators: true }
        ).select('-templateFilePath');

        res.status(200).json(updatedTemplate);
    } catch (error: any) {
        console.error('Error updating template:', error);
        if (templateFile) {
            try {
                await fs.unlink(templateFile.path);
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
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        const template = await CertificateTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        if (template.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        if (template.templateFilePath) {
            // Use path.resolve to get the absolute path from the project root
            const absolutePath = path.resolve(template.templateFilePath);
            
            try {
                await fs.unlink(absolutePath);
                console.log(`Successfully deleted physical file: ${absolutePath}`);
            } catch (fileError: any) {
                if (fileError.code !== 'ENOENT') { // ENOENT = Error No Entry (file not found)
                    console.error(`Error deleting physical file at ${absolutePath}:`, fileError);
                    // Optional: decide if you want to stop or continue if the file can't be deleted
                } else {
                    console.warn(`File not found at ${absolutePath}, but continuing to delete DB record.`);
                }
            }
        }

        await CertificateTemplate.deleteOne({ _id: req.params.id });
        console.log(`Successfully deleted template record from database: ${req.params.id}`);

        res.status(200).json({ message: 'Template deleted successfully' });

    } catch (error: any) {
        console.error('[DELETE] CRITICAL ERROR during template deletion:', error);
        res.status(500).json({ message: 'Server error while deleting template' });
    }
};