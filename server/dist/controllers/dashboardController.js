"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const CertificateTemplate_1 = __importDefault(require("../models/CertificateTemplate"));
const CertificateBatch_1 = __importDefault(require("../models/CertificateBatch"));
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Aggregation queries
        const totalTemplates = yield CertificateTemplate_1.default.countDocuments();
        const totalBatches = yield CertificateBatch_1.default.countDocuments();
        const totalCertificatesResult = yield CertificateBatch_1.default.aggregate([
            { $group: { _id: null, total: { $sum: "$total_certificates" } } }
        ]);
        const totalCertificates = totalCertificatesResult.length > 0 ? totalCertificatesResult[0].total : 0;
        // Data for the chart (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dailyGenerations = yield CertificateBatch_1.default.aggregate([
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
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});
exports.getDashboardStats = getDashboardStats;
