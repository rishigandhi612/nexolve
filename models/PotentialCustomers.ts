import mongoose, { Schema, Document } from 'mongoose';

export interface IPotentialCustomer extends Document {
  fullName: string;
  businessEmail: string;
  contactNumber: string;
  country: string;
  jobTitle: string;
  companyName: string;
  reportId: string; // Reference to the report being downloaded
  createdAt: Date;
}

const PotentialCustomerSchema: Schema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  businessEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true,
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
  },
  reportId: {
    type: String,
    required: true,
    ref: 'Report', // Reference to the Report model
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPotentialCustomer>('PotentialCustomer', PotentialCustomerSchema);