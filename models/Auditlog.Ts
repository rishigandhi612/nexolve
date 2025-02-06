import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagerAuth', required: true },
  actionType: String,
  target: String,
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
});

export default mongoose.model('AuditLog', auditLogSchema);