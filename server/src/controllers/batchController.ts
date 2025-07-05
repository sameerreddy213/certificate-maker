import { Request, Response } from 'express';
import CertificateBatch from '../models/CertificateBatch';
import Certificate from '../models/Certificate';
import { AuthRequest } from '../middleware/authMiddleware'; // Import our custom request type

// Get batches ONLY for the logged-in user
export const getBatches = async (req: AuthRequest, res: Response) => {
    try {
        const batches = await CertificateBatch.find({ userId: req.user?.id })
            .populate('template_id', 'name')
            .sort({ createdAt: -1 });
        res.json(batches);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching batches' });
    }
};

// Create a batch and associate it with the logged-in user
export const createBatch = async (req: AuthRequest, res: Response) => {
    const { excelData, ...batchData } = req.body;
    
    try {
        const newBatch = new CertificateBatch({
            ...batchData,
            userId: req.user?.id, // Set the userId from the request
        });
        await newBatch.save();

        if (excelData && excelData.length > 0) {
            const certificates = excelData.map((row: any) => ({
                userId: req.user?.id,
                batchId: newBatch._id,
                recipient_name: row.recipientName || row.name || 'Unknown',
                recipient_email: row.email || null,
                certificate_data: row,
                status: 'pending',
            }));
            await Certificate.insertMany(certificates);
        }

        res.status(201).json(newBatch);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating batch' });
    }
};

// Get certificates for a specific batch, ensuring user owns the batch
export const getCertificatesForBatch = async (req: AuthRequest, res: Response) => {
    try {
        const batch = await CertificateBatch.findOne({ _id: req.params.id, userId: req.user?.id });
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        const certificates = await Certificate.find({ batchId: req.params.id, userId: req.user?.id });
        res.json(certificates);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching certificates' });
    }
};