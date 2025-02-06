import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserAuth from '../models/UserAuth';
import { Document, Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface IUserAuth extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
}

declare global {
  namespace Express {
    interface Request {
      customer?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const customerAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      console.log('Decoded token:', decoded);

      const customer = await UserAuth.findById(decoded.userId).select('-password') as IUserAuth | null;
      console.log('Customer found:', customer ? 'Yes' : 'No');

      if (!customer) {
        return res.status(401).json({
          success: false,
          message: 'Customer not found',
        });
      }

      // Attach customer details to the request object
      req.customer = {
        userId: customer._id.toString(), // Now TypeScript knows _id exists and has toString()
        email: customer.email,
      };
      console.log('Customer attached to request:', req.customer);

      next();
    } catch (jwtError) {
      console.error('JWT Verification error:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Customer authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};