// server/src/config/jwt.ts

import dotenv from 'dotenv';

dotenv.config();

// Store the secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Check if the secret exists and exit if it doesn't
if (!JWT_SECRET) {
  console.error("FATAL_ERROR: JWT_SECRET is not defined in the .env file.");
  process.exit(1); // Stop the application from running in an insecure state
}

export const jwtConfig = {
  // TypeScript now knows JWT_SECRET is a string because of the check above
  secret: JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};