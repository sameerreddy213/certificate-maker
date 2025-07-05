import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import CertificateTemplate from '../models/CertificateTemplate';
import CertificateBatch from '../models/CertificateBatch';
import Certificate from '../models/Certificate';
import mongoose from 'mongoose'; // THE FIX IS HERE

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  // The 'protect' middleware guarantees that req.user is not null
  const userId = req.user!.id;

  try {
    // Get total counts
    const totalTemplates = await CertificateTemplate.countDocuments({ user_id: userId });
    const totalBatches = await CertificateBatch.countDocuments({ user_id: userId });
    const totalCertificates = await Certificate.countDocuments({ userId: userId });

    // Get data for the last 7 days for the chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const certificateCounts = await Certificate.aggregate([
      // Match documents for the specific user created in the last 7 days
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: sevenDaysAgo } } },
      {
        // Group by the creation date
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      // Sort by date in ascending order
      { $sort: { _id: 1 } },
    ]);

    // Format data for the client-side chart
    const chartData = certificateCounts.map(item => ({
      date: item._id,
      count: item.count,
    }));

    res.status(200).json({
      totalTemplates,
      totalBatches,
      totalCertificates,
      chartData,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
};