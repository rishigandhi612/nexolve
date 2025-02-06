// models/UserReport.ts
import mongoose from 'mongoose';

interface IUserReport extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  reportId: mongoose.Schema.Types.ObjectId;
  purchaseDate: Date;
  transactionId: string;
  lastAccessDate: Date;
  paymentStatus: 'completed' | 'pending' | 'failed';
  accessCount: number;
  isActive: boolean;
  updateAccess(): Promise<IUserReport>;
  canAccess(): boolean;
}

interface UserReportModel extends mongoose.Model<IUserReport> {
  updateAccess: () => Promise<IUserReport>;
  canAccess: () => boolean;
}

const userReportSchema = new mongoose.Schema({
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
  purchaseDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  lastAccessDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'pending'
  },
  accessCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a compound index for userId and reportId
userReportSchema.index({ userId: 1, reportId: 1 }, { unique: true });

// Add a method to update last access
userReportSchema.methods.updateAccess = async function(): Promise<IUserReport> {
  this.lastAccessDate = new Date();
  this.accessCount += 1;
  return this.save();
};

// Add a method to check if access is allowed
userReportSchema.methods.canAccess = function(): boolean {
  return this.isActive && this.paymentStatus === 'completed';
};

// Middleware to handle pre-save operations
userReportSchema.pre('save', function(next) {
  // If payment status changes to completed, ensure isActive is true
  if (this.isModified('paymentStatus') && this.paymentStatus === 'completed') {
    this.isActive = true;
  }
  next();
});

export default mongoose.model<IUserReport, UserReportModel>('UserReport', userReportSchema);