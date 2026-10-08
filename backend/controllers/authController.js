const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const registerUser = async (req, res) => {
    try {
        const { fullName, name, username, email, phone, dateOfBirth, password, pin } = req.body;

        // Validate Full Name
        const resolvedFullName = (fullName || name || '').trim();
        if (!resolvedFullName) {
            return res.status(400).json({ message: 'Full name is required' });
        }
        if (resolvedFullName.length < 2) {
            return res.status(400).json({ message: 'Full name must be at least 2 characters long' });
        }
        if (!/^[a-zA-Z\s'.]+$/.test(resolvedFullName)) {
            return res.status(400).json({ message: 'Full name should only contain letters and spaces' });
        }

        // Validate Username (cannot start with number, all letters lowercase, alphanumeric/underscore)
        const resolvedUsername = (username || name || '').trim().toLowerCase();
        if (!resolvedUsername) {
            return res.status(400).json({ message: 'Username is required' });
        }
        if (/^[0-9]/.test(resolvedUsername)) {
            return res.status(400).json({ message: 'Username cannot start with a number' });
        }
        if (/[A-Z]/.test(username || '')) {
            return res.status(400).json({ message: 'All letters in username must be lowercase' });
        }
        if (!/^[a-z][a-z0-9_]{2,29}$/.test(resolvedUsername)) {
            return res.status(400).json({ message: 'Username must start with a lowercase letter and contain only lowercase letters, numbers, or underscores (3-30 characters)' });
        }

        // Check if username is already taken
        const existingUsername = await User.findOne({
            $or: [
                { username: resolvedUsername },
                { name: { $regex: new RegExp(`^${resolvedUsername}$`, 'i') } }
            ]
        });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already exists. Please choose a different username.' });
        }

        // Validate Email (must contain gmail, ., com and match valid gmail structure)
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email address is required' });
        }
        const lowerEmail = email.toLowerCase().trim();
        if (!lowerEmail.includes('gmail') || !lowerEmail.includes('.') || !lowerEmail.includes('com') || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(lowerEmail)) {
            return res.status(400).json({ message: 'Email must be a valid Gmail address containing "gmail", ".", and "com" (e.g. username@gmail.com)' });
        }

        // Validate Password (at least 8 chars, 1st char uppercase, other lowercase and numbers)
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ message: 'Password is required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        if (!/^[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'First letter of password must be uppercase' });
        }
        if (!/^[A-Z][a-z0-9]+$/.test(password)) {
            return res.status(400).json({ message: 'Remaining password characters must be lowercase letters and numbers only' });
        }
        if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must include both lowercase letters and numbers' });
        }

        // Check if email already registered
        const existingUser = await User.findOne({ email: lowerEmail });
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
            fullName: resolvedFullName,
            username: resolvedUsername,
            name: resolvedFullName || resolvedUsername,
            email: lowerEmail,
            phone: String(phone).trim(),
            dateOfBirth: dob,
            password: hashedPassword,
            transactionPin: hashedPin
        });

        await newUser.save();

        // Save admin notification for new user registration request
        try {
            const Notification = require('../models/Notification');
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                const notification = new Notification({
                    userId: admin._id,
                    message: `New user registration request: "${newUser.name}" (${newUser.email}) is pending admin approval.`,
                    type: 'user_registered'
                });
                await notification.save();
            }
        } catch (notifErr) {
            console.error('Failed to save admin registration notification in DB:', notifErr);
        }

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
                const headers = req.headers || {};
                const rawForwarded = headers['x-forwarded-for'] || headers['x-real-ip'] || headers['cf-connecting-ip'] || headers['x-render-origin-ip'];

                if (rawForwarded) {
                    const firstIp = Array.isArray(rawForwarded) ? rawForwarded[0] : String(rawForwarded).split(',')[0].trim();
                    if (firstIp) capturedIP = firstIp;
                } else if (req.ip) {
                    capturedIP = req.ip;
                } else if (req.socket && req.socket.remoteAddress) {
                    capturedIP = req.socket.remoteAddress;
                }
            } catch (ipError) {
                capturedIP = 'Unknown';
            }

            if (capturedIP && typeof capturedIP === 'string') {
                capturedIP = capturedIP.replace(/^::ffff:/, '').trim();
            }

            if (!capturedIP || capturedIP === '::1' || capturedIP === '127.0.0.1' || capturedIP === 'localhost') {
                capturedIP = '127.0.0.1';
            }

            console.log(`[AUTH LOG] Admin Login Recorded IP: ${capturedIP}`);

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
                isFrozen: user.isFrozen || false,
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
            isFrozen: user.isFrozen || false,
            frozenAt: user.frozenAt || null,
            unfrozenAt: user.unfrozenAt || null,
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

const checkUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ available: false, message: 'Username parameter is required' });
        }
        const trimmed = username.trim().toLowerCase();
        if (/^[0-9]/.test(trimmed)) {
            return res.status(400).json({ available: false, message: 'Username cannot start with a number' });
        }
        if (!/^[a-z][a-z0-9_]{2,29}$/.test(trimmed)) {
            return res.status(400).json({ available: false, message: 'Username format is invalid' });
        }

        const existingUser = await User.findOne({
            $or: [
                { username: trimmed },
                { name: { $regex: new RegExp(`^${trimmed}$`, 'i') } }
            ]
        });

        if (existingUser) {
            return res.json({ available: false, message: 'Username already taken' });
        }

        return res.json({ available: true, message: 'Username is available' });
    } catch (error) {
        return res.status(500).json({ available: false, message: 'Error checking username', error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, verifyOldPassword, updatePassword, checkUsername };