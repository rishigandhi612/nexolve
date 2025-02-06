import { Request, Response, NextFunction } from 'express';

export const requireRole = (requiredRole: 'manager' | 'employee') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).manager?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (requiredRole === 'manager' && userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manager role required.'
      });
    }

    next();
  };
};