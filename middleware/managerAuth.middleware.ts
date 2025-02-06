import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ManagerAuth from '../models/ManagerAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const managerAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if the Authorization header is present and starts with "Bearer"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(' ')[1];

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    // Find the user in the database
    const manager = await ManagerAuth.findById(decoded.userId).select('-password');

    // If the user is not found, return an error
    if (!manager) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please sign in again.',
      });
    }

    // Attach the user's ID and role to the request object
    (req as any).manager = {
      userId: decoded.userId,
      role: decoded.role,
    };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    // Handle specific JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please sign in again.',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please sign in again.',
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
    });
  }
};