// models/Query.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IQuery extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: 'pending' | 'in-progress' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  managerResponse?: string;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
}

const QuerySchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  managerResponse: {
    type: String
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagerAuth'
  }
}, {
  timestamps: true // This will automatically handle createdAt and updatedAt
});

export default mongoose.model<IQuery>('Query', QuerySchema);