import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagerAuth',
    required: true
  },
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
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  responseDate: {
    type: Date
  },
  responseBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagerAuth'
  },
  comments: {
    type: String
  }
}, { timestamps: true });

// Add index for better query performance
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1, fromDate: 1 });

export default mongoose.model('Leave', leaveSchema);