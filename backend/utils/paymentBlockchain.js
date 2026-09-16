const crypto = require('crypto');
const PaymentBlock = require('../models/PaymentBlock');

/**
 * Creates and saves a new PaymentBlock into the payment blockchain ledger.
 * Signed by Authority Private Key (PoA SHA256 RSA).
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

        // Exact field order for PoA data signature:
        // index + transactionId + senderPaymentId + receiverPaymentId + senderName + receiverName + amount + timestamp (ISO string) + previousHash
        const dataToSign = `${index}${transactionData.transactionId}${transactionData.senderPaymentId}${transactionData.receiverPaymentId}${transactionData.senderName}${transactionData.receiverName}${transactionData.amount}${timestamp.toISOString()}${previousHash}`;

        // Sign payload with Authority Private Key
        const privateKey = process.env.AUTHORITY_PRIVATE_KEY;
        const publicKey = process.env.AUTHORITY_PUBLIC_KEY;

        let signature = 'N/A';
        if (privateKey) {
            const signer = crypto.createSign('SHA256');
            signer.update(dataToSign);
            signature = signer.sign(privateKey, 'hex');
        }

        // Include signature in data that gets hashed for the block's hash field
        const dataToHash = `${dataToSign}${signature}`;

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
            signature,
            authorityPublicKey: publicKey || 'N/A',
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
