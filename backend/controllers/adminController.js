const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const FraudAlert = require('../models/FraudAlert');
const { addBlock } = require('./blockchainController');

const generateAccountNumber = () => {
    return 'BB' + Math.floor(1000000000 + Math.random() * 9000000000);
};

const generatePaymentId = async (name) => {
    const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const candidatePaymentId = `${cleanName}${randomDigits}@blockbank`;

        const existingUser = await User.findOne({ paymentId: candidatePaymentId });
        if (!existingUser) {
            return candidatePaymentId;
        }
    }

    throw new Error('Unable to generate unique payment ID after 10 attempts');
};

const getPendingUsers = async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        res.status(200).json(pendingUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getApprovedUsers = async (req, res) => {
    try {
        const approvedUsers = await User.find({ status: 'approved', role: { $ne: 'admin' } }).select('-password');
        res.status(200).json(approvedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getRejectedUsers = async (req, res) => {
    try {
        const rejectedUsers = await User.find({ status: 'rejected' }).select('-password');
        res.status(200).json(rejectedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { initialBalance } = req.body || {};

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status === 'approved') {
            return res.status(400).json({ message: 'User already approved' });
        }

        // Validate initialBalance
        let balance = 1000;
        if (initialBalance !== undefined) {
            if (
                initialBalance === null ||
                Array.isArray(initialBalance) ||
                typeof initialBalance === 'boolean' ||
                (typeof initialBalance === 'string' && initialBalance.trim() === '') ||
                isNaN(Number(initialBalance))
            ) {
                return res.status(400).json({ message: 'Initial balance must be a valid number' });
            }

            const numericBalance = Number(initialBalance);
            if (numericBalance < 0) {
                return res.status(400).json({ message: 'Initial balance cannot be negative' });
            }

            const MAX_INITIAL_BALANCE = 1000000;
            balance = Math.min(numericBalance, MAX_INITIAL_BALANCE);
        }

        user.accountNumber = user.accountNumber || generateAccountNumber();
        if (!user.paymentId) {
            user.paymentId = await generatePaymentId(user.name);
        }
        user.balance = balance;
        user.status = 'approved';
        user.approvedAt = new Date();

        await user.save();

        // Audit block log
        const adminId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : user._id;
        try {
            await addBlock('approve', `Approved user ${user.name} (${user.email})`, adminId, user._id);
        } catch (blockErr) {
            console.error('Failed to log audit block for user approval:', blockErr);
        }

        // Trigger notification
        try {
            const notification = new Notification({
                userId: user._id,
                message: "Welcome to BlockBank! Your account has been approved.",
                type: 'account_approved'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create approval notification:', notifErr);
        }

        res.status(200).json({
            message: 'User approved successfully',
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountNumber: user.accountNumber,
                paymentId: user.paymentId,
                balance: user.balance,
                status: user.status
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Conflict: User with this payment ID or account number already exists. Please try again.',
                error: error.message
            });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const rejectUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'rejected';
        await user.save();

        // Audit block log
        const adminId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : user._id;
        try {
            await addBlock('reject', `Rejected user ${user.name} (${user.email})`, adminId, user._id);
        } catch (blockErr) {
            console.error('Failed to log audit block for user rejection:', blockErr);
        }

        res.status(200).json({ message: 'User rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id || req.user._id;
        const admin = await User.findById(adminId).select('-password -transactionPin');
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.status(200).json({
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            dateOfBirth: admin.dateOfBirth,
            status: admin.status,
            loginHistory: admin.loginHistory || []
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id || req.user._id;
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { name, phone, dateOfBirth } = req.body;

        if (name !== undefined) admin.name = name.trim();
        if (phone !== undefined) admin.phone = phone.trim();
        if (dateOfBirth !== undefined) {
            const dob = new Date(dateOfBirth);
            if (!isNaN(dob.getTime())) admin.dateOfBirth = dob;
        }

        await admin.save({ validateModifiedOnly: true });

        res.status(200).json({
            message: 'Profile updated successfully',
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            dateOfBirth: admin.dateOfBirth,
            status: admin.status,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching transactions', error: error.message });
    }
};

const toggleFreezeUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot freeze admin account' });
        }

        user.isFrozen = !user.isFrozen;
        if (user.isFrozen) {
            user.frozenAt = new Date();
        } else {
            user.unfrozenAt = new Date();
        }
        await user.save();

        const actionType = user.isFrozen ? 'freeze' : 'unfreeze';
        const actionMsg = user.isFrozen
            ? `Froze user ${user.name} (${user.email})`
            : `Unfroze user ${user.name} (${user.email})`;

        // Audit block log
        const adminId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : user._id;
        try {
            await addBlock(actionType, actionMsg, adminId, user._id);
        } catch (blockErr) {
            console.error(`Failed to log audit block for ${actionType}:`, blockErr);
        }

        try {
            const notification = new Notification({
                userId: user._id,
                message: user.isFrozen
                    ? "Your account has been frozen by BlockBank admin. Contact support."
                    : "Your account has been unfrozen by BlockBank admin. You can now perform transactions.",
                type: user.isFrozen ? 'account_frozen' : 'account_unfrozen'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create/emit freeze status notification:', notifErr);
        }

        res.status(200).json({
            message: user.isFrozen ? 'User account frozen successfully' : 'User account unfrozen successfully',
            isFrozen: user.isFrozen,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                isFrozen: user.isFrozen
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const freezeUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot freeze admin account' });
        }

        user.isFrozen = true;
        user.frozenAt = new Date();
        await user.save();

        // Audit block log
        const adminId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : user._id;
        try {
            await addBlock('freeze', `Froze user ${user.name} (${user.email})`, adminId, user._id);
        } catch (blockErr) {
            console.error('Failed to log audit block for freeze:', blockErr);
        }

        try {
            const notification = new Notification({
                userId: user._id,
                message: "Your account has been frozen by BlockBank admin. Contact support.",
                type: 'account_frozen'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create freeze notification:', notifErr);
        }

        res.status(200).json({
            message: 'User account frozen successfully',
            isFrozen: true,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                isFrozen: true
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const unfreezeUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isFrozen = false;
        user.unfrozenAt = new Date();
        await user.save();

        // Audit block log
        const adminId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : user._id;
        try {
            await addBlock('unfreeze', `Unfroze user ${user.name} (${user.email})`, adminId, user._id);
        } catch (blockErr) {
            console.error('Failed to log audit block for unfreeze:', blockErr);
        }

        try {
            const notification = new Notification({
                userId: user._id,
                message: "Your account has been unfrozen by BlockBank admin. You can now perform transactions.",
                type: 'account_unfrozen'
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Failed to create unfreeze notification:', notifErr);
        }

        res.status(200).json({
            message: 'User account unfrozen successfully',
            isFrozen: false,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                isFrozen: false
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin account' });
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({ message: 'User deleted permanently from database' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAdminFraudAlerts = async (req, res) => {
    try {
        const alerts = await FraudAlert.find()
            .sort({ createdAt: -1, detectedAt: -1 })
            .populate('userId', 'name paymentId email');

        const formattedAlerts = alerts.map((alert) => {
            let cleanAction = alert.userAction;
            if (cleanAction === 'overridden_by_user' || cleanAction === 'proceeded') {
                cleanAction = 'proceeded';
            } else if (cleanAction === 'cancelled_by_user' || cleanAction === 'cancelled') {
                cleanAction = 'cancelled';
            } else {
                cleanAction = cleanAction === 'pending' ? 'cancelled' : (cleanAction || 'cancelled');
            }

            const userName = alert.userName || alert.senderName || alert.userId?.name || 'Unknown User';
            const senderPaymentId = alert.senderPaymentId || alert.userId?.paymentId || '';

            return {
                _id: alert._id,
                userId: alert.userId?._id || alert.userId,
                userName,
                transactionId: alert.transactionId || '',
                senderPaymentId,
                receiverPaymentId: alert.receiverPaymentId || '',
                amount: alert.amount || 0,
                triggeredRules: (Array.isArray(alert.triggeredRules) && alert.triggeredRules.length > 0)
                    ? alert.triggeredRules
                    : (alert.message ? [alert.message] : []),
                userAction: cleanAction,
                reviewed: Boolean(alert.reviewed),
                createdAt: alert.createdAt || alert.detectedAt || new Date()
            };
        });

        res.status(200).json(formattedAlerts);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching fraud alerts', error: error.message });
    }
};

const reviewFraudAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const alert = await FraudAlert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Fraud alert not found' });
        }

        alert.reviewed = true;
        alert.resolved = true;
        alert.resolvedAt = new Date();
        alert.resolvedBy = req.user ? (req.user.id || req.user._id) : null;
        await alert.save();

        res.status(200).json({
            message: 'Fraud alert marked as reviewed',
            alert: {
                _id: alert._id,
                reviewed: alert.reviewed,
                resolved: alert.resolved
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error reviewing fraud alert', error: error.message });
    }
};

module.exports = {
    generatePaymentId,
    getPendingUsers,
    getApprovedUsers,
    getRejectedUsers,
    approveUser,
    rejectUser,
    getAdminProfile,
    updateAdminProfile,
    getAllTransactions,
    toggleFreezeUser,
    freezeUser,
    unfreezeUser,
    deleteUser,
    getAdminFraudAlerts,
    reviewFraudAlert
};
