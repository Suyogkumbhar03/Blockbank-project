const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcrypt');
const Notification = require('../models/Notification');

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

    // Correct PIN — reset counters
    user.pinAttempts = 0;
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
        const { receiverPaymentId, amount, note, pin } = req.body;

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

        // 5. Check sender has sufficient balance
        if (sender.balance < numericAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // 6. Perform balance transfer
        sender.balance -= numericAmount;
        receiver.balance += numericAmount;

        await sender.save({ validateModifiedOnly: true });
        await receiver.save({ validateModifiedOnly: true });

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
            status: 'success',
            timestamp: new Date()
        });

        await transaction.save();

        // Trigger receiver notification
        try {
            const notification = new Notification({
                userId: receiver._id,
                message: `You received ₹${numericAmount} from ${sender.name}`,
                type: 'money_received'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create transfer notification for receiver:', notifErr);
        }

        return res.status(200).json({
            message: 'Transfer successful',
            transaction,
            newBalance: sender.balance
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

        // Find all transactions where user is sender or receiver
        const transactions = await Transaction.find({
            $or: [
                { senderPaymentId: user.paymentId },
                { receiverPaymentId: user.paymentId }
            ]
        }).sort({ timestamp: -1 });

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
                timestamp: tx.timestamp,
                direction: isSender ? 'sent' : 'received'
            };
        });

        return res.status(200).json(formattedTransactions);
    } catch (error) {
        return res.status(500).json({ message: 'Server error fetching transaction history', error: error.message });
    }
};

module.exports = {
    verifyPin,
    verifyPaymentId,
    transferMoney,
    getTransactionHistory
};
