const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, dateOfBirth, password, pin } = req.body;

        // Check if email already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate Date of Birth & Age
        if (!dateOfBirth) {
            return res.status(400).json({ message: 'Date of birth is required' });
        }
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
            return res.status(400).json({ message: 'Invalid date of birth' });
        }

        const today = new Date();
        if (dob > today) {
            return res.status(400).json({ message: 'Date of birth cannot be in the future' });
        }

        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (age > 120) {
            return res.status(400).json({ message: 'Date of birth is invalid (age cannot exceed 120 years)' });
        }

        if (age < 10) {
            return res.status(400).json({ message: 'You must be at least 10 years old to open a BlockBank account, as per RBI guidelines for independent minor accounts.' });
        }

        // Validate Transaction PIN
        const stringPin = pin !== undefined && pin !== null ? String(pin).trim() : '';
        if (!/^\d{4}$/.test(stringPin)) {
            return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(stringPin, 10);

        const newUser = new User({
            name,
            email,
            phone,
            dateOfBirth: dob,
            password: hashedPassword,
            transactionPin: hashedPin
        });

        await newUser.save();

        res.status(201).json({
            message: 'Registration successful. Your account is pending admin approval.',
            userId: newUser._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if (user.status !== 'approved') {
            return res.status(403).json({ message: 'Account not yet approved by admin' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Track login history for admin accounts (keep last 3, newest first)
        if (user.role === 'admin') {
            let capturedIP = 'Unknown';
            try {
                if (req.ip) {
                    capturedIP = req.ip;
                } else if (req.headers && req.headers['x-forwarded-for']) {
                    const rawHeader = req.headers['x-forwarded-for'];
                    capturedIP = Array.isArray(rawHeader) ? rawHeader[0] : String(rawHeader).split(',')[0].trim();
                }
            } catch (ipError) {
                capturedIP = 'Unknown';
            }
            if (!capturedIP || capturedIP === '::1' || capturedIP === '::ffff:127.0.0.1') {
                capturedIP = '127.0.0.1';
            }

            const newEntry = { timestamp: new Date(), ip: String(capturedIP) };

            const validPrevious = Array.isArray(user.loginHistory)
                ? user.loginHistory
                    .map(item => {
                        if (item && typeof item === 'object' && item.timestamp) {
                            return { timestamp: new Date(item.timestamp), ip: String(item.ip || 'Unknown') };
                        }
                        if (item && (item instanceof Date || typeof item === 'string' || typeof item === 'number')) {
                            const d = new Date(item);
                            return isNaN(d.getTime()) ? null : { timestamp: d, ip: 'Unknown' };
                        }
                        return null;
                    })
                    .filter(Boolean)
                : [];

            user.loginHistory = [newEntry, ...validPrevious].slice(0, 3);
            user.markModified('loginHistory');
            await user.save({ validateModifiedOnly: true });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountNumber: user.accountNumber,
                paymentId: user.paymentId,
                balance: user.balance !== undefined ? user.balance : 1000,
                loginHistory: user.loginHistory || []
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -transactionPin');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            name: user.name,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            status: user.status,
            accountNumber: user.accountNumber,
            paymentId: user.paymentId,
            balance: user.balance !== undefined ? user.balance : 1000,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, phone } = req.body;

        if (name !== undefined) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();

        await user.save({ validateModifiedOnly: true });

        res.status(200).json({
            message: 'Profile updated successfully',
            name: user.name,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            status: user.status,
            accountNumber: user.accountNumber,
            paymentId: user.paymentId,
            balance: user.balance !== undefined ? user.balance : 1000,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const verifyOldPassword = async (req, res) => {
    try {
        const { oldPassword } = req.body;
        if (!oldPassword) {
            return res.status(400).json({ valid: false, message: 'Current password is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ valid: false, message: 'Incorrect current password' });
        }

        return res.status(200).json({ valid: true, message: 'Password verified' });
    } catch (error) {
        return res.status(500).json({ valid: false, message: 'Server error verifying password', error: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New password and confirmation do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save({ validateModifiedOnly: true });

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error updating password', error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, verifyOldPassword, updatePassword };