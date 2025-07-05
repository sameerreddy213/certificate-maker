"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose")); // Make sure mongoose is imported
const auth_1 = __importDefault(require("./routes/auth"));
const templates_1 = __importDefault(require("./routes/templates"));
const batches_1 = __importDefault(require("./routes/batches")); // New: Import batch routes
const dashboard_1 = __importDefault(require("./routes/dashboard")); // Assuming you have this route
// New: Import models to ensure they are registered with Mongoose
require("./models/User");
require("./models/CertificateTemplate");
require("./models/CertificateBatch"); // New: Import CertificateBatch model
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // For parsing application/json
app.use(express_1.default.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// Serve static files from 'generated_certificates' directory (for downloads)
const path_1 = __importDefault(require("path"));
app.use('/generated_certificates', express_1.default.static(path_1.default.join(__dirname, '../generated_certificates')));
// Also for uploaded templates if you need to access them (e.g., for re-download by admin)
app.use('/uploaded_templates', express_1.default.static(path_1.default.join(__dirname, '../uploads/templates')));
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/certgen')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/templates', templates_1.default);
app.use('/api/batches', batches_1.default); // New: Use batch routes
app.use('/api/dashboard', dashboard_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
