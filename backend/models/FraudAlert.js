const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema({
    blockIndex: { type: Number, required: true },
    message: { type: String, required: true },
    detectedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
});

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
