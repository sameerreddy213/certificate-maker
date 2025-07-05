import { Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';
import { AuthRequest } from '../middleware/authMiddleware'; // Import our custom request type
import mongoose from 'mongoose'; // Import mongoose to check for validation errors

// Get templates ONLY for the logged-in user
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure userId is present before querying
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const templates = await CertificateTemplate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error); // Log the actual error
    res.status(500).json({ message: 'Error fetching templates' });
  }
};

// Create a template and associate it with the logged-in user
export const createTemplate = async (req: AuthRequest, res: Response) => {
    try {
        // Explicitly check if userId is available from authentication
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Authentication required to create a template.' });
        }

        const newTemplate = new CertificateTemplate({
            ...req.body,
            userId: req.user.id, // Set the userId from the request
        });

        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error: any) {
        console.error('Error creating template:', error); // Log the actual error for backend debugging

        // Improve error messaging for validation errors
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({ message: 'Validation failed', errors });
        } else if (error.code === 11000) { // Duplicate key error (e.g., if you add unique constraint later)
            return res.status(409).json({ message: 'Duplicate key error: A template with this name might already exist.' });
        }
        
        res.status(500).json({ message: 'Failed to create template due to a server error.' });
    }
};

// Delete a template belonging to the logged-in user
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
    try {
        // Ensure userId is present
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Authentication required to delete a template.' });
        }

        // Find the template by its ID and ensure it belongs to the authenticated user
        const template = await CertificateTemplate.findOne({ _id: req.params.id, userId: req.user.id });

        if (!template) {
            // If no template is found, return a 404 error
            return res.status(404).json({ message: 'Template not found or you do not have permission to delete it.' });
        }

        // Use the deleteOne method on the document
        await template.deleteOne();

        res.json({ message: 'Template removed successfully.' });
    } catch (error: any) {
        console.error('Error deleting template:', error); // Log the actual error
        res.status(500).json({ message: 'Failed to delete template due to a server error.' });
    }
};
