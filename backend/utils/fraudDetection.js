const Transaction = require('../models/Transaction');

/**
 * Evaluates fraud detection rules for a transaction.
 *
 * @param {Object} transactionData
 * @param {string} transactionData.senderPaymentId
 * @param {string} transactionData.receiverPaymentId
 * @param {number} transactionData.amount
 * @param {number} transactionData.senderAccountAge - Age of sender account in hours
 * @param {Date} [transactionData.timestamp]
 * @param {number} pinAttemptsBefore - Number of failed PIN attempts before this successful transfer
 * @returns {Promise<{ isFraud: boolean, triggeredRules: string[] }>}
 */
const checkFraud = async (transactionData, pinAttemptsBefore = 0) => {
    const triggeredRules = [];
    const amount = Number(transactionData.amount) || 0;
    const senderAccountAge = Number(transactionData.senderAccountAge);

    // Rule 1 — Large Amount
    if (amount > 50000) {
        triggeredRules.push("This transfer amount is unusually large (above ₹50,000).");
    }

    // Reference time for 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Rule 2 — Rapid Transfers (count completed transactions by same sender in last 2 mins)
    const recentCount = await Transaction.countDocuments({
        senderPaymentId: transactionData.senderPaymentId,
        status: { $ne: 'cancelled' },
        $or: [
            { createdAt: { $gte: twoMinutesAgo } },
            { timestamp: { $gte: twoMinutesAgo } }
        ]
    });
    if (recentCount >= 5) {
        triggeredRules.push("You have made 5 or more transfers in the last 2 minutes.");
    }

    // Rule 3 — Duplicate Transfer (same sender, same receiver, exact same amount within 2 mins)
    const duplicate = await Transaction.findOne({
        senderPaymentId: transactionData.senderPaymentId,
        receiverPaymentId: transactionData.receiverPaymentId,
        amount: amount,
        status: { $ne: 'cancelled' },
        $or: [
            { createdAt: { $gte: twoMinutesAgo } },
            { timestamp: { $gte: twoMinutesAgo } }
        ]
    });
    if (duplicate) {
        triggeredRules.push("This looks like a duplicate transfer — same amount to the same person within 2 minutes.");
    }

    // Rule 4 — Multiple Failed PIN Attempts
    if (Number(pinAttemptsBefore) >= 2) {
        triggeredRules.push("This transfer was made after 2 failed PIN attempts. Please confirm this was you.");
    }

    // Rule 5 — New Account Large Transfer (account < 24 hours old and amount > 10000)
    if (!isNaN(senderAccountAge) && senderAccountAge < 24 && amount > 10000) {
        triggeredRules.push("Your account was approved less than 24 hours ago and is making a large transfer.");
    }

    // Rule 6 — Repeated Transfer to Same Receiver Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await Transaction.countDocuments({
        senderPaymentId: transactionData.senderPaymentId,
        receiverPaymentId: transactionData.receiverPaymentId,
        status: { $ne: 'cancelled' },
        $or: [
            { createdAt: { $gte: startOfDay } },
            { timestamp: { $gte: startOfDay } }
        ]
    });
    if (todayCount >= 5) {
        triggeredRules.push("You have already sent money to this person 5 or more times today.");
    }

    // Rule 7 — Unusual Hour (IST)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(Date.now() + istOffset);
    const hourIST = istTime.getUTCHours();

    if (hourIST >= 1 && hourIST < 5) {
        triggeredRules.push("This transfer is happening between 1 AM and 5 AM Indian time, which is an unusual hour.");
    }

    return {
        isFraud: triggeredRules.length > 0,
        triggeredRules
    };
};

module.exports = { checkFraud };
module.exports.checkFraud = checkFraud;
