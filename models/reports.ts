import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  serialNumber: string; // Manually entered serial number
  reportName: string;
  industry: string;
  cost: number;
  size: string;
  uploadDate: Date;
  lastModified: Date;
  status: 'active' | 'archived' | 'draft';
  fileType: string;
  file: Buffer;
  description: string;
  thumbnail: Buffer;
  thumbnailType: string;
  samplePdf: Buffer;
  samplePdfType: string;
}

const ReportSchema: Schema = new Schema({
  serialNumber: {
    type: String,
    required: false, // Optional field for manual entry
    trim: true,
  },
  reportName: {
    type: String,
    required: true,
    trim: true,
  },
  industry: {
    type: String,
    required: true,
    trim: true,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
  size: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'draft',
  },
  fileType: {
    type: String,
    required: true,
  },
  file: {
    type: Buffer,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  thumbnail: {
    type: Buffer,
  },
  thumbnailType: {
    type: String,
  },
  samplePdf: {
    type: Buffer,
  },
  samplePdfType: {
    type: String,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Add a method to get the _id as a string (for convenience)
ReportSchema.methods.getReportIdString = function (): string {
  return this._id.toString();
};

export default mongoose.model<IReport>('Report', ReportSchema);