import { Request, Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';

// Define the custom request type that includes the user
interface AuthRequest extends Request {
  user?: { id: string };
}

export const getTemplates = async (req: AuthRequest, res: Response) => {
 try {
   const templates = await CertificateTemplate.find({ userId: req.user?.id }).sort({ createdAt: -1 });
   res.json(templates);
 } catch (error: any) {
   res.status(500).json({ message: 'Error fetching templates' });
 }
};

export const createTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const newTemplate = new CertificateTemplate({
            ...req.body,
            userId: req.user?.id, // Add the user ID
        });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating template' });
    }
};