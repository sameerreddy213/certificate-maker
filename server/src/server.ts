// server/src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose'; // Make sure mongoose is imported

import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import batchRoutes from './routes/batches'; // New: Import batch routes
import dashboardRoutes from './routes/dashboard'; // Assuming you have this route

// New: Import models to ensure they are registered with Mongoose
import './models/User';
import './models/CertificateTemplate';
import './models/CertificateBatch'; // New: Import CertificateBatch model

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from 'generated_certificates' directory (for downloads)
import path from 'path';
app.use('/generated_certificates', express.static(path.join(__dirname, '../generated_certificates')));
// Also for uploaded templates if you need to access them (e.g., for re-download by admin)
app.use('/uploaded_templates', express.static(path.join(__dirname, '../uploads/templates')));


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/certgen')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/batches', batchRoutes); // New: Use batch routes
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});