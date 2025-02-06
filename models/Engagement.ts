import mongoose from 'mongoose';

const engagementSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  views: { type: Number, default: 0 },
  readingProgress: { type: Number, default: 0 },
  lastAccessed: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Engagement', engagementSchema);
