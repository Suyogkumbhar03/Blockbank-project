const User = require('../models/User');
const Transaction = require('../models/Transaction');

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
    // Note regarding ACID transactions:
    // In production MongoDB environments with replica sets, multi-document ACID transactions
    // using `mongoose.startSession()` should be used to guarantee that balance modifications
    // and transaction record creation execute atomically without risk of partial updates.
    try {
        const { receiverPaymentId, amount, note } = req.body;

        // 1. Fetch sender document
        const sender = await User.findById(req.user.id);
        if (!sender || sender.status !== 'approved') {
            return res.status(400).json({ message: 'Sender account is not active or approved' });
        }

        // 2. Look up receiver by receiverPaymentId
        if (!receiverPaymentId) {
            return res.status(400).json({ message: 'Receiver Payment ID is required' });
        }

        const receiver = await User.findOne({ paymentId: receiverPaymentId.trim() });
        if (!receiver || receiver.status !== 'approved') {
            return res.status(404).json({ message: 'No active account found with this Payment ID' });
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

        await sender.save();
        await receiver.save();

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
    verifyPaymentId,
    transferMoney,
    getTransactionHistory
};
