import mongoose from 'mongoose';

const managerAuthSchema = new mongoose.Schema({
  profilePic: String,
  fullName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['manager', 'employee'],
    default: 'employee'
  }
}, { timestamps: true });

export default mongoose.model('ManagerAuth', managerAuthSchema);