// models/Blog.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  thumbnail: {
    data: Buffer;
    contentType: string;
    alt: string;
  };
  author: {
    name: string;
  };
  publishedDate: Date;
  content: {
    type: 'text' | 'heading' | 'subheading';
    content: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema = new Schema({
  title: {
    type: String,
    required: true
  },
  thumbnail: {
    data: {
      type: Buffer,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    }
  },
  author: {
    name: {
      type: String,
      required: true
    }
  },
  publishedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  content: [{
    type: {
      type: String,
      enum: ['text', 'heading', 'subheading'],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model<IBlog>('Blog', BlogSchema);