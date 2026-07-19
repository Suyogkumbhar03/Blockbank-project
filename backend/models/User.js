const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  accountNumber: { type: String, unique: true, sparse: true },
  paymentId: { type: String, unique: true, sparse: true },
  balance: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
