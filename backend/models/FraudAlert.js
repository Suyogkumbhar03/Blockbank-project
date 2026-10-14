const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema({
    alertType: {
        type: String,
        enum: ['transaction_fraud', 'blockchain_tamper'],
        default: 'transaction_fraud'
    },
    // For blockchain tampering alerts
    blockIndex: { type: Number, default: null },
    type: { type: String, default: '' },
    changedFields: [{ type: String }],

    // For transaction fraud alerts
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    senderPaymentId: { type: String, default: '' },
    receiverPaymentId: { type: String, default: '' },
    senderName: { type: String, default: '' },
    receiverName: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    triggeredRules: [{ type: String }],
    userAction: {
        type: String,
        enum: ['pending', 'cancelled', 'proceeded', 'cancelled_by_user', 'overridden_by_user'],
        default: 'pending'
    },
    reviewed: { type: Boolean, default: false },

    // Common fields
    message: { type: String, required: true },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'high'
    },
    detectedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
