const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['money_received', 'money_sent', 'account_approved', 'pin_unlocked', 'account_frozen', 'account_unfrozen', 'user_registered', 'fraud_alert', 'admin'],
        required: true
    },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
