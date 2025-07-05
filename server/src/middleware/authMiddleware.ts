// server/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Get token from header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { user: { id: string } };

      // 3. THE FIX: Access the nested user ID from decoded.user.id
      req.user = await User.findById(decoded.user.id).select('-password');

      // 4. Handle case where user might have been deleted after token was issued
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next(); // Success! Go to the next middleware/controller
    } catch (error) {
      // This catches errors like an expired or malformed token
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // This catches requests with no token at all
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};