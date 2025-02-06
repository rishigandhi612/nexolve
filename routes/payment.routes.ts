// routes/payment.routes.ts
import express from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware';
import {
  handlePaymentSuccess,
  getUserPurchasedReports,
  verifyReportAccess,
} from '../controller/paymentSuccess.controller';

const router = express.Router();

// Public routes (no auth required)
router.post('/payment-success', handlePaymentSuccess);

// Protected routes (auth required)
router.get('/purchased-reports', customerAuthMiddleware, getUserPurchasedReports);
router.get('/verify-access/:reportId', customerAuthMiddleware, verifyReportAccess);

export default router;