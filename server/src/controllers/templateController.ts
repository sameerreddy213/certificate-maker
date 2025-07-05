import { Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';
import { AuthRequest } from '../middleware/authMiddleware'; // Import our custom request type

// Get templates ONLY for the logged-in user
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const templates = await CertificateTemplate.find({ userId: req.user?.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching templates' });
  }
};

// Create a template and associate it with the logged-in user
export const createTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const newTemplate = new CertificateTemplate({
            ...req.body,
            userId: req.user?.id, // Set the userId from the request
        });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating template' });
    }
};

// Delete a template belonging to the logged-in user
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
    try {
        // Find the template by its ID and ensure it belongs to the authenticated user
        const template = await CertificateTemplate.findOne({ _id: req.params.id, userId: req.user?.id });

        if (!template) {
            // If no template is found, return a 404 error
            return res.status(404).json({ message: 'Template not found' });
        }

        // Use the deleteOne method on the document
        await template.deleteOne();

        res.json({ message: 'Template removed' });
    } catch (error: any) {
        // Handle potential errors during the deletion process
        res.status(500).json({ message: 'Error deleting template' });
    }
};
