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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCertificatesForBatch = exports.createBatch = exports.getBatches = void 0;
const CertificateBatch_1 = __importDefault(require("../models/CertificateBatch"));
const Certificate_1 = __importDefault(require("../models/Certificate"));
// Get batches ONLY for the logged-in user
const getBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const batches = yield CertificateBatch_1.default.find({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id })
            .populate('template_id', 'name')
            .sort({ createdAt: -1 });
        res.json(batches);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching batches' });
    }
});
exports.getBatches = getBatches;
// Create a batch and associate it with the logged-in user
const createBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const _b = req.body, { excelData } = _b, batchData = __rest(_b, ["excelData"]);
    try {
        const newBatch = new CertificateBatch_1.default(Object.assign(Object.assign({}, batchData), { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }));
        yield newBatch.save();
        if (excelData && excelData.length > 0) {
            const certificates = excelData.map((row) => {
                var _a;
                return ({
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                    batchId: newBatch._id,
                    recipient_name: row.recipientName || row.name || 'Unknown',
                    recipient_email: row.email || null,
                    certificate_data: row,
                    status: 'pending',
                });
            });
            yield Certificate_1.default.insertMany(certificates);
        }
        res.status(201).json(newBatch);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating batch' });
    }
});
exports.createBatch = createBatch;
// Get certificates for a specific batch, ensuring user owns the batch
const getCertificatesForBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const batch = yield CertificateBatch_1.default.findOne({ _id: req.params.id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        const certificates = yield Certificate_1.default.find({ batchId: req.params.id, userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id });
        res.json(certificates);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching certificates' });
    }
});
exports.getCertificatesForBatch = getCertificatesForBatch;
