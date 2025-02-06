import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },
  addressLine1: String,
  addressLine2: String,
  locality: String,
  city: String,
  pinCode: String,
  country: String,
}, { timestamps: true });

export default mongoose.model('Address', addressSchema);
