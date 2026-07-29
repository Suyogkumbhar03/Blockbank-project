const User = require('../models/User');

const generateAccountNumber = () => {
    return 'BB' + Math.floor(1000000000 + Math.random() * 9000000000);
};

const generatePaymentId = (name) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    return `${cleanName}@blockbank`;
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
        const approvedUsers = await User.find({ status: 'approved' }).select('-password');
        res.status(200).json(approvedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { initialBalance } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status === 'approved') {
            return res.status(400).json({ message: 'User already approved' });
        }

        user.accountNumber = generateAccountNumber();
        user.paymentId = generatePaymentId(user.name);
        user.balance = initialBalance || 0;
        user.status = 'approved';

        await user.save();

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

        res.status(200).json({ message: 'User rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('-password -transactionPin');
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
        const admin = await User.findById(req.user.id);
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

module.exports = { getPendingUsers, getApprovedUsers, approveUser, rejectUser, getAdminProfile, updateAdminProfile };
