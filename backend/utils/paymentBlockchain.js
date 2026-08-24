const crypto = require('crypto');
const PaymentBlock = require('../models/PaymentBlock');

/**
 * Creates and saves a new PaymentBlock into the payment blockchain ledger.
 * Wrapped in try/catch to ensure errors never break caller execution (e.g. transfer money flow).
 * 
 * @param {Object} transactionData - Details of the saved transaction
 */
const addPaymentBlock = async (transactionData) => {
    try {
        if (!transactionData) return;

        // Fetch last PaymentBlock sorted by index desc
        const lastBlock = await PaymentBlock.findOne().sort({ index: -1 });

        let previousHash = '0';
        let index = 0;

        if (lastBlock) {
            previousHash = lastBlock.hash;
            index = lastBlock.index + 1;
        }

        const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();

        // Combine all transaction fields + previousHash into one string
        const dataToHash = `${index}${transactionData.transactionId}${transactionData.senderPaymentId}${transactionData.receiverPaymentId}${transactionData.senderName}${transactionData.receiverName}${transactionData.amount}${timestamp.toISOString()}${previousHash}`;

        // Compute SHA256 hash
        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        // Create & save new PaymentBlock
        const paymentBlock = new PaymentBlock({
            index,
            transactionId: transactionData.transactionId,
            senderPaymentId: transactionData.senderPaymentId,
            receiverPaymentId: transactionData.receiverPaymentId,
            senderName: transactionData.senderName,
            receiverName: transactionData.receiverName,
            amount: transactionData.amount,
            timestamp,
            previousHash,
            hash
        });

        await paymentBlock.save();
    } catch (error) {
        console.error('Failed to add payment block to blockchain:', error);
    }
};

module.exports = {
    addPaymentBlock
};
