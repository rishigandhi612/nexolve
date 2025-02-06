import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);