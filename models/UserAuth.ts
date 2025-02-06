import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserAuth extends mongoose.Document {
  profilePic?: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  nationality?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // New fields from payment form
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userAuthSchema = new mongoose.Schema({
  profilePic: {
    type: String,
    default: null
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // New address fields
  addressLine1: {
    type: String,
    trim: true
  },
  addressLine2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
userAuthSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userAuthSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model<IUserAuth>('UserAuth', userAuthSchema);