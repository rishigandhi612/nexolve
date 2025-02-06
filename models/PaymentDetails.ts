import mongoose from 'mongoose';

export interface IPaymentDetails extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  reportId: mongoose.Schema.Types.ObjectId;
  transactionId: string;
  paypalOrderId?: string;
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDate: Date;
  // Address information
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const paymentDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paypalOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  // Customer Details
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  // Address Details
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: {
    type: String
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IPaymentDetails>('PaymentDetails', paymentDetailsSchema);