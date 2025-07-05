import { Request, Response } from 'express';
import CertificateBatch from '../models/CertificateBatch';

interface AuthRequest extends Request {
  user?: { id: string };
}

export const getBatches = async (req: AuthRequest, res: Response) => {
    try {
        const batches = await CertificateBatch.find({ userId: req.user?.id }).populate('template_id', 'name').sort({ createdAt: -1 });
        res.json(batches);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching batches' });
    }
};

export const createBatch = async (req: AuthRequest, res: Response) => {
    try {
        const newBatch = new CertificateBatch({
            ...req.body,
            userId: req.user?.id, // Add the user ID
        });
        await newBatch.save();
        res.status(201).json(newBatch);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating batch' });
    }
};