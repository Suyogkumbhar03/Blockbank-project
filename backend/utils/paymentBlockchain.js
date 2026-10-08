const crypto = require('crypto');
const PaymentBlock = require('../models/PaymentBlock');
const Transaction = require('../models/Transaction');

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

/**
 * Validates the complete payment blockchain.
 * Executes:
 * 1. Link integrity check (previousHash == prevBlock.hash)
 * 2. Hash integrity check (recalculated SHA-256 hash)
 * 3. RSA Authority signature verification
 * 4. Check 1 — Index Sequence Check
 * 5. Check 2 — Timestamp Ordering Check
 * 6. Check 3 — Cross-verify Block Data Against Transaction Record
 * 7. Check 4 — Orphan Transaction Detection
 * 8. Check 5 — Severity Levels (OK, WARNING, CRITICAL)
 */
const validatePaymentChain = async () => {
    const blocks = await PaymentBlock.find().sort({ index: 1 });
    const results = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const prevBlock = i > 0 ? blocks[i - 1] : null;

        // 1. Link integrity check
        let linkValid = true;
        if (block.index === 0) {
            linkValid = block.previousHash === '0';
        } else {
            linkValid = Boolean(prevBlock && block.previousHash === prevBlock.hash);
        }

        // 2. Recompute data string & hash
        const timestamp = block.timestamp ? new Date(block.timestamp) : new Date();
        const dataToSign = `${block.index}${block.transactionId}${block.senderPaymentId}${block.receiverPaymentId}${block.senderName}${block.receiverName}${block.amount}${timestamp.toISOString()}${block.previousHash}`;
        const dataToHash = `${dataToSign}${block.signature}`;

        // Recompute SHA-256 hash
        const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        const hashValid = block.hash === computedHash;

        // 3. PoA Signature verification
        let signatureValid = true;
        if (block.signature && block.signature !== 'N/A' && block.authorityPublicKey && block.authorityPublicKey !== 'N/A') {
            try {
                const verifier = crypto.createVerify('SHA256');
                verifier.update(dataToSign);
                signatureValid = verifier.verify(block.authorityPublicKey, block.signature, 'hex');
            } catch (e) {
                signatureValid = false;
            }
        }

        const blockResult = {
            index: block.index,
            hashValid,
            signatureValid,
            linkValid
        };

        // Check 1 — Index Sequence Check
        blockResult.indexValid = (block.index === i);

        // Check 2 — Timestamp Ordering Check
        if (i === 0) {
            blockResult.timestampValid = true;
        } else {
            blockResult.timestampValid = new Date(block.timestamp) >= new Date(blocks[i - 1].timestamp);
        }

        // Check 3 — Cross-verify Block Data Against Transaction Record
        const transaction = await Transaction.findOne({ transactionId: block.transactionId });

        if (!transaction) {
            blockResult.transactionExists = false;
            blockResult.transactionMatches = false;
        } else {
            blockResult.transactionExists = true;
            blockResult.transactionMatches = (
                Number(transaction.amount) === Number(block.amount) &&
                transaction.senderPaymentId === block.senderPaymentId &&
                transaction.receiverPaymentId === block.receiverPaymentId
            );
        }

        // Check 5 — Severity Levels
        if (!blockResult.hashValid || !blockResult.signatureValid || !blockResult.transactionExists || !blockResult.transactionMatches) {
            blockResult.severity = "CRITICAL";
        } else if (!blockResult.timestampValid || !blockResult.indexValid || !blockResult.linkValid) {
            blockResult.severity = "WARNING";
        } else {
            blockResult.severity = "OK";
        }

        // Plain English reasons for admin display
        const plainReasons = [];
        if (!blockResult.hashValid) {
            plainReasons.push("Digital fingerprint does not match. Block data was modified.");
        }
        if (!blockResult.signatureValid) {
            plainReasons.push("Digital authority signature is invalid. Block was not signed by authorized bank authority.");
        }
        if (!blockResult.linkValid) {
            plainReasons.push("Chain link is broken. Previous block reference does not match.");
        }
        if (!blockResult.indexValid) {
            plainReasons.push("Block number is out of order. Some blocks may have been deleted or inserted.");
        }
        if (!blockResult.timestampValid) {
            plainReasons.push("This block's time is earlier than the previous block. Blocks may have been tampered with or reordered.");
        }
        if (!blockResult.transactionExists) {
            plainReasons.push("No matching bank transaction found for this block. This block may be fake or manually inserted.");
        } else if (!blockResult.transactionMatches) {
            plainReasons.push("Block data does not match the original bank transaction. Amount, sender, or receiver has been changed.");
        }

        blockResult.reasons = plainReasons;
        blockResult.status = blockResult.severity === 'OK' ? 'PASS' : 'FAIL';

        results.push(blockResult);
    }

    // Check 4 — Orphan Transaction Detection
    const allTransactions = await Transaction.find({});
    const blockTxIds = blocks.map(b => b.transactionId);
    const orphanTransactions = allTransactions.filter(t => !blockTxIds.includes(t.transactionId));

    const formattedOrphans = orphanTransactions.map(t => ({
        transactionId: t.transactionId,
        amount: t.amount,
        sender: t.senderPaymentId,
        receiver: t.receiverPaymentId,
        date: t.timestamp,
        issue: "This bank transaction has no block on the blockchain. It was never recorded."
    }));

    const chainValid = blocks.length > 0
        ? results.every(r => r.severity === "OK") && orphanTransactions.length === 0
        : true;

    return {
        valid: chainValid,
        totalBlocks: blocks.length,
        passed: results.filter(r => r.severity === "OK").length,
        warnings: results.filter(r => r.severity === "WARNING").length,
        critical: results.filter(r => r.severity === "CRITICAL").length,
        orphanTransactions: formattedOrphans,
        orphanCount: formattedOrphans.length,
        message: chainValid
            ? "All blocks are healthy. The blockchain is valid."
            : "Problems were found in the blockchain. Check the block details below.",
        results
    };
};

module.exports = {
    addPaymentBlock,
    validatePaymentChain
};
