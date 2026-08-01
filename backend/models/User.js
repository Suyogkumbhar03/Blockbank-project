const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    password: { type: String, required: true },
    transactionPin: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    accountNumber: { type: String, unique: true, sparse: true },
    paymentId: { type: String, unique: true, sparse: true },
    loginHistory: [{
        timestamp: { type: Date, required: true },
        ip: { type: String, default: 'Unknown' }
    }],
    pinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
