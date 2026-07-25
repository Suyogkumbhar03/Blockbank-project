const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    senderAccount: { type: String, default: '' },
    receiverAccount: { type: String, default: '' },
    senderPaymentId: { type: String, required: true },
    receiverPaymentId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverName: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
