const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const { sendVerificationEmail } = require('../utils/sendEmail');

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

        // Require verified EmailOtp record within last 30 minutes
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const verifiedRecord = await EmailOtp.findOne({
            email: lowerEmail,
            verified: true,
            verifiedAt: { $gte: thirtyMinutesAgo }
        });

        if (!verifiedRecord) {
            return res.status(400).json({ message: 'Please verify your email with OTP first' });
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

        // Delete EmailOtp record after successful registration
        try {
            await EmailOtp.deleteOne({ email: lowerEmail });
        } catch (otpDelErr) {
            console.error('Failed to delete EmailOtp record after user registration:', otpDelErr.message);
        }

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

const sendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email address is required' });
        }

        const lowerEmail = email.toLowerCase().trim();
        if (!lowerEmail.includes('gmail') || !lowerEmail.includes('.') || !lowerEmail.includes('com') || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(lowerEmail)) {
            return res.status(400).json({ message: 'Email must be a valid Gmail address containing "gmail", ".", and "com" (e.g. username@gmail.com)' });
        }

        const existingUser = await User.findOne({ email: lowerEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const now = new Date();
        let otpRecord = await EmailOtp.findOne({ email: lowerEmail });

        if (otpRecord && otpRecord.lockedUntil && otpRecord.lockedUntil > now) {
            const remainingMs = otpRecord.lockedUntil.getTime() - now.getTime();
            const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
            return res.status(429).json({
                message: `Too many failed attempts. Verification is locked. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
            });
        }

        // 60-second cooldown between sends
        if (otpRecord && otpRecord.lastSentAt) {
            const elapsedMs = now.getTime() - otpRecord.lastSentAt.getTime();
            if (elapsedMs < 60 * 1000) {
                const secondsRemaining = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000));
                return res.status(429).json({
                    message: `Please wait ${secondsRemaining} second${secondsRemaining === 1 ? '' : 's'} before requesting another OTP.`
                });
            }
        }

        // Maximum 5 sends per hour per email
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const isNewWindow = !otpRecord || !otpRecord.sendWindowStart || (now.getTime() - otpRecord.sendWindowStart.getTime() > ONE_HOUR_MS);
        const currentSendCount = isNewWindow ? 0 : (otpRecord.sendCount || 0);

        if (currentSendCount >= 5) {
            const windowRemainingMs = ONE_HOUR_MS - (now.getTime() - otpRecord.sendWindowStart.getTime());
            const remainingMinutes = Math.max(1, Math.ceil(windowRemainingMs / (60 * 1000)));
            return res.status(429).json({
                message: `Maximum of 5 OTP requests per hour reached for this email. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
            });
        }

        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otpCode, 10);
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

        // Send email first — if sending fails, return generic 500 and remove OTP record so user can retry
        try {
            await sendVerificationEmail(lowerEmail, otpCode);
        } catch (sendErr) {
            try {
                await EmailOtp.deleteOne({ email: lowerEmail });
            } catch (delErr) {
                // ignore deletion error
            }
            return res.status(500).json({ message: sendErr.message || 'Could not send email' });
        }

        if (!otpRecord) {
            otpRecord = new EmailOtp({
                email: lowerEmail,
                otpHash,
                expiresAt,
                attempts: 0,
                sendCount: 1,
                sendWindowStart: now,
                lastSentAt: now,
                lockedUntil: null,
                verified: false,
                verifiedAt: null
            });
        } else {
            otpRecord.sendWindowStart = isNewWindow ? now : otpRecord.sendWindowStart;
            otpRecord.sendCount = currentSendCount + 1;
            otpRecord.otpHash = otpHash;
            otpRecord.expiresAt = expiresAt;
            otpRecord.attempts = 0;
            otpRecord.lastSentAt = now;
            otpRecord.lockedUntil = null;
            otpRecord.verified = false;
            otpRecord.verifiedAt = null;
        }
        await otpRecord.save();

        return res.status(200).json({ message: 'OTP sent' });
    } catch (error) {
        return res.status(500).json({ message: 'Could not send email' });
    }
};

const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
            return res.status(400).json({ message: 'Email and 6-digit OTP are required' });
        }

        const cleanOtp = otp.trim();
        if (!/^\d{6}$/.test(cleanOtp)) {
            return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
        }

        const lowerEmail = email.toLowerCase().trim();
        const now = new Date();
        const otpRecord = await EmailOtp.findOne({ email: lowerEmail });

        if (otpRecord && otpRecord.lockedUntil && otpRecord.lockedUntil > now) {
            const remainingMs = otpRecord.lockedUntil.getTime() - now.getTime();
            const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
            return res.status(429).json({
                message: `Too many failed attempts. Verification is locked. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
            });
        }

        if (!otpRecord || !otpRecord.otpHash || !otpRecord.expiresAt || otpRecord.expiresAt <= now) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one' });
        }

        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
        if (!isMatch) {
            const newAttempts = (otpRecord.attempts || 0) + 1;
            otpRecord.attempts = newAttempts;

            if (newAttempts >= 5) {
                otpRecord.otpHash = null; // delete the OTP
                otpRecord.lockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
                otpRecord.expiresAt = new Date(now.getTime() + 35 * 60 * 1000);
                await otpRecord.save();
                return res.status(429).json({
                    message: 'Too many failed attempts. Verification is locked for 30 minutes.'
                });
            }

            const remainingAttempts = 5 - newAttempts;
            await otpRecord.save();
            return res.status(400).json({
                message: `Invalid OTP code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
            });
        }

        // Correct code
        otpRecord.verified = true;
        otpRecord.verifiedAt = now;
        otpRecord.otpHash = null; // clear otpHash so the code cannot be reused
        otpRecord.attempts = 0;
        otpRecord.expiresAt = new Date(now.getTime() + 35 * 60 * 1000); // valid for registration within 30 mins
        await otpRecord.save();

        return res.status(200).json({ verified: true });
    } catch (error) {
        return res.status(500).json({ message: 'Server error verifying OTP', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    verifyOldPassword,
    updatePassword,
    checkUsername,
    sendEmailOtp,
    verifyEmailOtp
};