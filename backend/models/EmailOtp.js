const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    otpHash: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    sendCount: {
        type: Number,
        default: 0
    },
    sendWindowStart: {
        type: Date,
        default: Date.now
    },
    lastSentAt: {
        type: Date,
        default: null
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// TTL index to automatically purge expired records
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
