import { Request, Response } from 'express';
import CertificateTemplate from '../models/CertificateTemplate';
import CertificateBatch from '../models/CertificateBatch';
import User from '../models/User'; // Assuming you might want user-specific stats later

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Aggregation queries
    const totalTemplates = await CertificateTemplate.countDocuments();
    const totalBatches = await CertificateBatch.countDocuments();

    const totalCertificatesResult = await CertificateBatch.aggregate([
      { $group: { _id: null, total: { $sum: "$total_certificates" } } }
    ]);
    const totalCertificates = totalCertificatesResult.length > 0 ? totalCertificatesResult[0].total : 0;

    // Data for the chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyGenerations = await CertificateBatch.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: "$total_certificates" }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    // Format chart data
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayData = dailyGenerations.find(d => d._id === dateString);
        chartData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: dayData ? dayData.count : 0,
        });
    }

    res.json({
      totalTemplates,
      totalBatches,
      totalCertificates,
      chartData,
    });

  } catch (error: any) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};