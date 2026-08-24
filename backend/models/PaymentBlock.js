const mongoose = require('mongoose');

const paymentBlockSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    transactionId: { type: String, required: true },
    senderPaymentId: { type: String, required: true },
    receiverPaymentId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverName: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true }
});

module.exports = mongoose.model('PaymentBlock', paymentBlockSchema);
