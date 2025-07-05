import { Router } from 'express';
import { register, login } from '../controllers/authController'; // Correctly import authentication functions

const router = Router();

// Public routes for user registration and login
router.post('/register', register); // Handles POST requests to /api/auth/register
router.post('/login', login);     // Handles POST requests to /api/auth/login

export default router;