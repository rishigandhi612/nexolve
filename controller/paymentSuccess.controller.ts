import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import UserAuth from '../models/UserAuth';
import PaymentDetails from '../models/PaymentDetails';
import UserReport from '../models/UserReports';
import Report from '../models/reports'; // Import the updated Report model
const paypal = require('@paypal/checkout-server-sdk'); // Use require instead of import
import paypalClient from '../utils/paypalClient'; // Import PayPal client

// Interface for payment form data
interface PaymentFormData {
  fullName: string; // Combined firstName and lastName
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Interface for PayPal response data
interface PayPalResponseData {
  id: string; // PayPal order ID
  status: string; // Payment status
  payer: {
    email_address: string; // Payer's email
  };
  purchase_units: {
    amount: {
      value: string; // Payment amount
    };
  }[];
}

// Utility function to generate temporary password
const generateTempPassword = (): string => {
  return crypto.randomBytes(4).toString('hex');
};

/**
 * Handles successful payment and creates necessary records in the database.
 */
export const handlePaymentSuccess = async (req: Request, res: Response) => {
  try {
    const paymentFormData: PaymentFormData = req.body.formData;
    const paypalData: PayPalResponseData = req.body.paypalData;
    const reportId = req.body.reportId;

    // Validate payment data
    if (!paymentFormData || !paypalData || !reportId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
        details: {
          formData: !!paymentFormData,
          paypalData: !!paypalData,
          reportId: !!reportId,
        },
      });
    }

    // Validate email
    if (!paymentFormData.email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(paymentFormData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        details: {
          email: paymentFormData.email,
        },
      });
    }

    // Verify the payment with PayPal
    const request = new paypal.orders.OrdersGetRequest(paypalData.id);
    const response = await paypalClient.execute(request);

    if (response.result.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
      });
    }

    // Convert reportId to ObjectId if it's a string
    const reportObjectId = mongoose.Types.ObjectId.isValid(reportId)
      ? new mongoose.Types.ObjectId(reportId)
      : null;

    if (!reportObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reportId',
      });
    }

    // Check if the report exists
    const report = await Report.findById(reportObjectId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if user already exists
    let user = await UserAuth.findOne({ email: paymentFormData.email });
    let tempPassword: string | null = null;

    // If user doesn't exist, create a new user
    if (!user) {
      tempPassword = generateTempPassword();

      user = new UserAuth({
        fullName: paymentFormData.fullName, // Use fullName from the frontend
        email: paymentFormData.email,
        password: tempPassword, // Will be hashed by the model's pre-save middleware
        phone: paymentFormData.phone,
        addressLine1: paymentFormData.addressLine1,
        addressLine2: paymentFormData.addressLine2,
        city: paymentFormData.city,
        state: paymentFormData.state,
        zipCode: paymentFormData.zipCode,
        country: paymentFormData.country,
      });

      await user.save();
    }

    // Create payment record
    const paymentRecord = new PaymentDetails({
      userId: user._id,
      reportId: reportObjectId, // Use the ObjectId
      transactionId: paypalData.id,
      amount: parseFloat(paypalData.purchase_units[0].amount.value),
      paymentStatus: 'completed',
      fullName: paymentFormData.fullName,
      email: paymentFormData.email,
      phone: paymentFormData.phone,
      addressLine1: paymentFormData.addressLine1,
      addressLine2: paymentFormData.addressLine2,
      city: paymentFormData.city,
      state: paymentFormData.state,
      zipCode: paymentFormData.zipCode,
      country: paymentFormData.country,
    });

    await paymentRecord.save();

    // Create user-report mapping
    const userReport = new UserReport({
      userId: user._id,
      reportId: reportObjectId, // Use the ObjectId
      transactionId: paypalData.id,
      paymentStatus: 'completed',
      purchaseDate: new Date(),
    });

    await userReport.save();

    // Prepare response
    const responseData: any = {
      success: true,
      message: 'Payment processed successfully',
      paymentId: paymentRecord._id,
      userReportId: userReport._id,
    };

    // If new user, include credentials
    if (tempPassword) {
      responseData.credentials = {
        email: user.email,
        temporaryPassword: tempPassword,
        message: 'Please login with these credentials and change your password',
      };
    }

    // Send response
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Payment success handling error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({
      success: false,
      message: 'Error processing payment completion',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Fetches all purchased reports for a user.
 */
export const getUserPurchasedReports = async (req: Request, res: Response) => {
  try {
    const userId = req.customer?.userId; // Assuming customer data is attached to the request
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Fetch purchased reports and populate the report details
    const purchasedReports = await UserReport.find({ userId })
      .populate({
        path: 'reportId',
        select: 'reportName industry description cost size uploadDate', // Select fields to include
      })
      .sort({ purchaseDate: -1 });

    res.json({
      success: true,
      reports: purchasedReports,
    });
  } catch (error) {
    console.error('Error fetching purchased reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchased reports',
    });
  }
};

/**
 * Verifies if a user has access to a specific report.
 */
export const verifyReportAccess = async (req: Request, res: Response) => {
  try {
    const userId = req.customer?.userId; // Assuming customer data is attached to the request
    const { reportId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Convert reportId to ObjectId
    const reportObjectId = mongoose.Types.ObjectId.isValid(reportId)
      ? new mongoose.Types.ObjectId(reportId)
      : null;

    if (!reportObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reportId',
      });
    }

    // Check if the user has access to the report
    const userReport = await UserReport.findOne({
      userId,
      reportId: reportObjectId,
      paymentStatus: 'completed',
    });

    if (!userReport) {
      return res.status(403).json({
        success: false,
        message: 'No access to this report',
      });
    }

    // Update access count and last access date
    userReport.accessCount += 1;
    userReport.lastAccessDate = new Date();
    await userReport.save();

    res.json({
      success: true,
      message: 'Access verified',
    });
  } catch (error) {
    console.error('Error verifying report access:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying report access',
    });
  }
};