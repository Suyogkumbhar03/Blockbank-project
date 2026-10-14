const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        default: ''
    },
    userPaymentId: {
        type: String,
        default: ''
    },
    userEmail: {
        type: String,
        default: ''
    },
    issueType: {
        type: String,
        enum: ["Unauthorized Transfer", "Suspicious Login", "Wrong Transaction", "Other"],
        required: true
    },
    transactionId: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Open",
        enum: ["Open", "Under Investigation", "Resolved"]
    },
    adminNote: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
