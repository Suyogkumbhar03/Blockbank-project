const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcrypt');
const Notification = require('../models/Notification');
const FraudAlert = require('../models/FraudAlert');
const { addPaymentBlock } = require('../utils/paymentBlockchain');
const { checkFraud } = require('../utils/fraudDetection');

// Helper for PIN verification and attempt/lockout tracking
const verifyAndTrackPin = async (user, pin) => {
    // 1. Check if currently locked out
    if (user.pinLockedUntil) {
        if (user.pinLockedUntil > new Date()) {
            const remainingMs = user.pinLockedUntil - new Date();
            const remainingMins = Math.ceil(remainingMs / 60000);
            return {
                success: false,
                status: 429,
                locked: true,
                message: `Too many incorrect attempts. Transfers locked for ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.`
            };
        } else {
            // Lock has expired!
            user.pinAttempts = 0;
            user.pinLockedUntil = null;
            await user.save({ validateModifiedOnly: true });

            try {
                const notification = new Notification({
                    userId: user._id,
                    message: "Your account is unlocked. You can now proceed with payments.",
                    type: 'pin_unlocked'
                });
                await notification.save();
            } catch (notifErr) {
                console.error('Failed to create PIN unlocked notification:', notifErr);
            }
        }
    }

    const stringPin = pin !== undefined && pin !== null ? String(pin).trim() : '';
    if (!stringPin || !user.transactionPin) {
        return handleWrongPin(user);
    }

    const isMatch = await bcrypt.compare(stringPin, user.transactionPin);
    if (!isMatch) {
        return handleWrongPin(user);
    }

    // Correct PIN — clear lockout if any, preserve pinAttempts for transfer fraud detection
    user.pinLockedUntil = null;
    await user.save({ validateModifiedOnly: true });

    return { success: true };
};

const handleWrongPin = async (user) => {
    user.pinAttempts = (user.pinAttempts || 0) + 1;

    if (user.pinAttempts >= 3) {
        // Lock for 30 minutes
        user.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.pinAttempts = 0;
        await user.save({ validateModifiedOnly: true });
        return {
            success: false,
            status: 429,
            locked: true,
            message: 'Too many incorrect attempts. Transfers are locked for 30 minutes.'
        };
    }

    const attemptsLeft = 3 - user.pinAttempts;
    await user.save({ validateModifiedOnly: true });
    return {
        success: false,
        status: 400,
        message: `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
    };
};

// TASK 7: Verify PIN endpoint controller (with lockout after 3 wrong attempts)
const verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        const pinResult = await verifyAndTrackPin(user, pin);
        if (!pinResult.success) {
            return res.status(pinResult.status).json({
                valid: false,
                locked: pinResult.locked,
                message: pinResult.message
            });
        }

        return res.status(200).json({ valid: true });
    } catch (error) {
        return res.status(500).json({ valid: false, message: 'Server error verifying PIN', error: error.message });
    }
};

// TASK 2: Verify Payment ID endpoint controller
const verifyPaymentId = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({ found: false, message: 'Payment ID is required' });
        }

        const user = await User.findOne({ paymentId: paymentId.trim() });

        if (!user || user.status !== 'approved') {
            return res.status(200).json({
                found: false,
                message: 'No active account found with this Payment ID'
            });
        }

        if (user.isFrozen) {
            return res.status(200).json({
                found: false,
                message: 'This recipient account is currently frozen'
            });
        }

        // Return only name and paymentId for privacy
        return res.status(200).json({
            found: true,
            name: user.name,
            paymentId: user.paymentId
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error verifying Payment ID', error: error.message });
    }
};

// TASK 3: Transfer endpoint controller
const transferMoney = async (req, res) => {
    try {
        const { receiverPaymentId, amount, note, pin, userConfirmedFraud } = req.body;

        // 1. Fetch sender document
        const sender = await User.findById(req.user.id);
        if (!sender || sender.status !== 'approved') {
            return res.status(400).json({ message: 'Sender account is not active or approved' });
        }

        if (sender.isFrozen) {
            return res.status(400).json({ message: 'Your account is frozen. You cannot perform transactions.' });
        }

        // 1b. Verify Transaction PIN & enforce Lockout
        const pinResult = await verifyAndTrackPin(sender, pin);
        if (!pinResult.success) {
            return res.status(pinResult.status).json({
                message: pinResult.message,
                locked: pinResult.locked
            });
        }

        // 2. Look up receiver by receiverPaymentId
        if (!receiverPaymentId) {
            return res.status(400).json({ message: 'Receiver Payment ID is required' });
        }

        const receiver = await User.findOne({ paymentId: receiverPaymentId.trim() });
        if (!receiver || receiver.status !== 'approved') {
            return res.status(404).json({ message: 'No active account found with this Payment ID' });
        }

        if (receiver.isFrozen) {
            return res.status(400).json({ message: 'Recipient account is frozen and cannot receive funds.' });
        }

        // 3. Prevent self-transfer
        if (sender.paymentId === receiver.paymentId) {
            return res.status(400).json({ message: 'Cannot transfer money to your own account' });
        }

        // 4. Validate amount is a positive number
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }

        // 5. Check sender has sufficient balance (pre-check)
        if (sender.balance < numericAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Read pinAttempts from sender and save before reset, then reset to 0
        const pinAttemptsBefore = sender.pinAttempts || 0;
        sender.pinAttempts = 0;
        await sender.save({ validateModifiedOnly: true });

        // Fraud detection check: skip if user confirmed after fraud warning
        if (!userConfirmedFraud) {
            // Calculate sender account age in hours
            const approvedTime = sender.approvedAt
                ? new Date(sender.approvedAt).getTime()
                : (sender.createdAt ? new Date(sender.createdAt).getTime() : Date.now());
            const accountAgeHours = (Date.now() - approvedTime) / (1000 * 60 * 60);

            const fraudResult = await checkFraud({
                senderPaymentId: sender.paymentId,
                receiverPaymentId: receiver.paymentId,
                amount: numericAmount,
                senderAccountAge: accountAgeHours,
                timestamp: new Date()
            }, pinAttemptsBefore);

            if (fraudResult.isFraud) {
                let fraudAlertId = null;
                try {
                    const fraudAlert = new FraudAlert({
                        alertType: 'transaction_fraud',
                        userId: sender._id,
                        userName: sender.name,
                        senderPaymentId: sender.paymentId,
                        receiverPaymentId: receiver.paymentId,
                        senderName: sender.name,
                        receiverName: receiver.name,
                        amount: numericAmount,
                        triggeredRules: fraudResult.triggeredRules,
                        userAction: 'pending',
                        reviewed: false,
                        message: `Transfer of ₹${numericAmount} to ${receiver.name} (${receiver.paymentId}) flagged: ${fraudResult.triggeredRules.join('; ')}`,
                        severity: numericAmount > 50000 || fraudResult.triggeredRules.length >= 2 ? 'critical' : 'high',
                        detectedAt: new Date()
                    });
                    await fraudAlert.save();
                    fraudAlertId = fraudAlert._id;
                } catch (alertErr) {
                    console.error('Failed to create FraudAlert document:', alertErr);
                }

                return res.status(200).json({
                    requiresConfirmation: true,
                    fraudAlertId,
                    triggeredRules: fraudResult.triggeredRules,
                    message: "Suspicious activity detected. Please confirm to proceed."
                });
            }
        } else {
            // User confirmed proceeding despite warning: update FraudAlert record
            try {
                const { fraudAlertId } = req.body;
                if (fraudAlertId) {
                    await FraudAlert.findByIdAndUpdate(fraudAlertId, { userAction: 'overridden_by_user' });
                } else {
                    await FraudAlert.findOneAndUpdate(
                        { userId: sender._id, userAction: 'pending' },
                        { userAction: 'overridden_by_user' },
                        { sort: { detectedAt: -1 } }
                    );
                }
            } catch (err) {
                console.error('Failed to update FraudAlert on override:', err);
            }
        }

        // 6. ATOMIC BALANCE TRANSFER (Isolation & Concurrency Protection)
        // Step 6a: Deduct balance from sender atomically ONLY if sender balance >= numericAmount
        const updatedSender = await User.findOneAndUpdate(
            {
                _id: sender._id,
                balance: { $gte: numericAmount },
                isFrozen: false,
                status: 'approved'
            },
            { $inc: { balance: -numericAmount } },
            { new: true }
        );

        if (!updatedSender) {
            return res.status(400).json({ message: 'Insufficient balance or account is inactive/frozen' });
        }

        // Step 6b: Add balance to receiver atomically
        const updatedReceiver = await User.findOneAndUpdate(
            {
                _id: receiver._id,
                isFrozen: false,
                status: 'approved'
            },
            { $inc: { balance: numericAmount } },
            { new: true }
        );

        if (!updatedReceiver) {
            // Revert sender balance deduction if receiver credit failed
            await User.updateOne(
                { _id: sender._id },
                { $inc: { balance: numericAmount } }
            );
            return res.status(400).json({ message: 'Recipient account is frozen or inactive. Transfer cancelled.' });
        }

        // 7. Generate unique transaction ID & create Transaction record
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timeSuffix = Date.now().toString(36).toUpperCase();
        const txId = `TX-${randomSuffix}${timeSuffix}`;

        const transaction = new Transaction({
            transactionId: txId,
            senderAccount: sender.accountNumber || '',
            receiverAccount: receiver.accountNumber || '',
            senderPaymentId: sender.paymentId,
            receiverPaymentId: receiver.paymentId,
            senderName: sender.name,
            receiverName: receiver.name,
            amount: numericAmount,
            note: note ? note.trim() : '',
            status: 'completed',
            cancelReason: '',
            timestamp: new Date()
        });

        await transaction.save();

        // Create PaymentBlock in payment blockchain
        addPaymentBlock({
            transactionId: transaction.transactionId,
            senderPaymentId: transaction.senderPaymentId,
            receiverPaymentId: transaction.receiverPaymentId,
            senderName: transaction.senderName,
            receiverName: transaction.receiverName,
            amount: transaction.amount,
            timestamp: transaction.timestamp
        });

        // Trigger notifications for both receiver and sender
        try {
            const receiverNotif = new Notification({
                userId: receiver._id,
                message: `You received ₹${numericAmount} from ${sender.name}`,
                type: 'money_received'
            });
            await receiverNotif.save();

            const senderNotif = new Notification({
                userId: sender._id,
                message: `You sent ₹${numericAmount} to ${receiver.name}`,
                type: 'money_sent'
            });
            await senderNotif.save();
        } catch (notifErr) {
            console.error('Failed to create transfer notification:', notifErr);
        }

        // Add 1 — "Proceeded Anyway" consequence:
        // When user proceeds despite fraud warning, save fraud alert with userAction: "proceeded", transactionId, and notify admins.
        if (userConfirmedFraud) {
            try {
                const { fraudAlertId } = req.body;
                let updatedAlert = null;
                if (fraudAlertId) {
                    updatedAlert = await FraudAlert.findByIdAndUpdate(
                        fraudAlertId,
                        { userAction: 'proceeded', transactionId: txId },
                        { new: true }
                    );
                }
                if (!updatedAlert) {
                    await FraudAlert.findOneAndUpdate(
                        {
                            userId: sender._id,
                            userAction: { $in: ['pending', 'overridden_by_user', 'proceeded'] }
                        },
                        { userAction: 'proceeded', transactionId: txId },
                        { sort: { detectedAt: -1, createdAt: -1 } }
                    );
                }

                // Create admin notification: “[User name] proceeded with a flagged transfer of ₹[amount] to [receiver] despite a fraud warning. Transaction ID: [id].”
                const adminNotifMessage = `${sender.name} proceeded with a flagged transfer of ₹${numericAmount} to ${receiver.name} despite a fraud warning. Transaction ID: ${txId}.`;
                const admins = await User.find({ role: 'admin' });
                for (const admin of admins) {
                    const notif = new Notification({
                        userId: admin._id,
                        message: adminNotifMessage,
                        type: 'fraud_alert'
                    });
                    await notif.save();
                }
            } catch (fraudProceedErr) {
                console.error('Failed to handle proceeded fraud alert / admin notification:', fraudProceedErr);
            }
        }

        return res.status(200).json({
            message: 'Transfer successful',
            transaction,
            newBalance: updatedSender.balance
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error processing transfer', error: error.message });
    }
};

// TASK 4: Transaction history endpoint controller
const getTransactionHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { status, type, excludeUnsuccessful } = req.query;

        // Build database query
        const query = {
            $or: [
                { senderPaymentId: user.paymentId },
                { receiverPaymentId: user.paymentId }
            ]
        };

        if (status) {
            const normalized = status.toLowerCase().trim();
            if (normalized === 'completed' || normalized === 'success') {
                query.status = { $in: ['completed', 'success'] };
            } else {
                query.status = normalized;
            }
        } else if (excludeUnsuccessful === 'true') {
            query.status = { $in: ['completed', 'success'] };
        }

        if (type === 'sent') {
            query.senderPaymentId = user.paymentId;
            delete query.$or;
        } else if (type === 'received') {
            query.receiverPaymentId = user.paymentId;
            delete query.$or;
        }

        const transactions = await Transaction.find(query).sort({ timestamp: -1 });

        // Map and attach direction relative to logged-in user
        const formattedTransactions = transactions.map((tx) => {
            const isSender = tx.senderPaymentId === user.paymentId;
            return {
                _id: tx._id,
                transactionId: tx.transactionId,
                senderAccount: tx.senderAccount,
                receiverAccount: tx.receiverAccount,
                senderPaymentId: tx.senderPaymentId,
                receiverPaymentId: tx.receiverPaymentId,
                senderName: tx.senderName,
                receiverName: tx.receiverName,
                amount: tx.amount,
                note: tx.note,
                status: tx.status,
                cancelReason: tx.cancelReason || '',
                timestamp: tx.timestamp,
                createdAt: tx.createdAt,
                direction: isSender ? 'sent' : 'received'
            };
        });

        return res.status(200).json(formattedTransactions);
    } catch (error) {
        return res.status(500).json({ message: 'Server error fetching transaction history', error: error.message });
    }
};

// Daily spending aggregation endpoint controller
// Returns 7-day spending for authenticated user strictly excluding cancelled, failed, rejected, or pending transactions
const getDailySpending = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only query completed/successful outgoing transfers where money was deducted
        const completedTransactions = await Transaction.find({
            senderPaymentId: user.paymentId,
            status: { $in: ['completed', 'success'] }
        }).sort({ timestamp: -1 });

        const days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
            days.push({ dateStr, dayLabel, totalAmount: 0, count: 0 });
        }

        const seenTxIds = new Set();
        completedTransactions.forEach((tx) => {
            if (!tx || !tx.timestamp) return;

            // Deduplicate: ensure each transaction is counted only once
            const txKey = tx.transactionId || (tx._id ? tx._id.toString() : null);
            if (txKey) {
                if (seenTxIds.has(txKey)) return;
                seenTxIds.add(txKey);
            }

            const rawStatus = (tx.status || '').toLowerCase().trim();
            if (rawStatus !== 'completed' && rawStatus !== 'success') return;
            if (['cancelled', 'failed', 'rejected', 'pending'].includes(rawStatus)) return;

            const amt = Number(tx.amount);
            if (isNaN(amt) || amt <= 0) return;

            const txDate = new Date(tx.timestamp);
            if (isNaN(txDate.getTime())) return;
            const txDateStr = txDate.toISOString().split('T')[0];

            const dayObj = days.find((d) => d.dateStr === txDateStr);
            if (dayObj) {
                dayObj.totalAmount += amt;
                dayObj.count += 1;
            }
        });

        const maxAmount = Math.max(...days.map((d) => d.totalAmount), 1);
        const chartData = days.map((d) => ({
            ...d,
            heightPct: d.totalAmount > 0 ? Math.max(Math.round((d.totalAmount / maxAmount) * 100), 12) : 0
        }));

        return res.status(200).json(chartData);
    } catch (error) {
        return res.status(500).json({ message: 'Server error calculating spending', error: error.message });
    }
};

// Cancel transfer endpoint controller
const cancelTransfer = async (req, res) => {
    try {
        const { transactionId, senderPaymentId, receiverPaymentId, amount, reason } = req.body;

        const sender = await User.findById(req.user.id);
        let receiver = null;
        if (receiverPaymentId) {
            receiver = await User.findOne({ paymentId: receiverPaymentId.trim() });
        }

        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timeSuffix = Date.now().toString(36).toUpperCase();
        const txId = transactionId || `TX-${randomSuffix}${timeSuffix}`;

        const cancelledTx = new Transaction({
            transactionId: txId,
            senderAccount: sender?.accountNumber || '',
            receiverAccount: receiver?.accountNumber || '',
            senderPaymentId: sender?.paymentId || senderPaymentId || 'Unknown',
            receiverPaymentId: receiver?.paymentId || receiverPaymentId || 'Unknown',
            senderName: sender?.name || 'Unknown',
            receiverName: receiver?.name || 'Unknown',
            amount: Number(amount) || 0,
            note: reason || 'User cancelled after fraud warning',
            status: 'cancelled',
            cancelReason: 'Suspicious activity detected — cancelled by user',
            timestamp: new Date()
        });

        await cancelledTx.save();

        // Update FraudAlert document if recorded
        try {
            const { fraudAlertId } = req.body;
            if (fraudAlertId) {
                await FraudAlert.findByIdAndUpdate(fraudAlertId, {
                    userAction: 'cancelled',
                    transactionId: txId
                });
            } else if (sender) {
                await FraudAlert.findOneAndUpdate(
                    { userId: sender._id, userAction: { $in: ['pending', 'cancelled_by_user', 'cancelled'] } },
                    { userAction: 'cancelled', transactionId: txId },
                    { sort: { detectedAt: -1, createdAt: -1 } }
                );
            }
        } catch (alertErr) {
            console.error('Failed to update FraudAlert on cancellation:', alertErr);
        }

        return res.status(200).json({
            message: 'Transfer cancelled successfully',
            transaction: cancelledTx
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error cancelling transfer', error: error.message });
    }
};

// GET /api/transfer/fraud-alerts
// Returns current user's security & fraud alerts
const getMyFraudAlerts = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const alerts = await FraudAlert.find({
            $or: [
                { userId: user._id },
                { senderPaymentId: user.paymentId }
            ]
        }).sort({ detectedAt: -1 });

        return res.status(200).json(alerts);
    } catch (error) {
        return res.status(500).json({ message: 'Server error fetching fraud alerts', error: error.message });
    }
};

// POST /api/transfer/self-freeze
// Allows user to freeze their own account immediately if they suspect compromise
const selfFreezeAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isFrozen) {
            return res.status(400).json({ message: 'Account is already frozen' });
        }

        user.isFrozen = true;
        user.frozenAt = new Date();
        await user.save();

        try {
            const notification = new Notification({
                userId: user._id,
                message: "You have temporarily frozen your account for security protection. Transfers are locked.",
                type: 'account_frozen'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create self-freeze notification:', notifErr);
        }

        return res.status(200).json({
            message: 'Account successfully locked for your security. Transfers are now disabled.',
            isFrozen: true
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error freezing account', error: error.message });
    }
};

module.exports = {
    verifyPin,
    verifyPaymentId,
    transferMoney,
    cancelTransfer,
    getTransactionHistory,
    getMyFraudAlerts,
    selfFreezeAccount,
    getDailySpending
};
