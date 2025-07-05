import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import batchRoutes from './routes/batches';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Database Connection and Server Start
mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    app.listen(port, () => console.log(`Server running on port: ${port}`));
  })
  .catch((error: any) => {
    console.error('Database connection error:', error.message);
  });