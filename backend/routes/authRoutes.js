const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    verifyOldPassword,
    updatePassword,
    checkUsername,
    sendEmailOtp,
    verifyEmailOtp
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Per-IP rate limiting: 5 send requests per 15 minutes
const sendOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        message: 'Too many OTP requests from this IP address. Please try again after 15 minutes.'
    }
});

// Per-IP rate limiting: 15 verify requests per 15 minutes
const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        message: 'Too many OTP verification attempts from this IP address. Please try again after 15 minutes.'
    }
});

router.post('/send-email-otp', sendOtpLimiter, sendEmailOtp);
router.post('/verify-email-otp', verifyOtpLimiter, verifyEmailOtp);

router.post('/register', registerUser);
router.get('/check-username', checkUsername);
router.post('/login', loginUser);
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateUserProfile);
router.post('/verify-old-password', verifyToken, verifyOldPassword);
router.put('/update-password', verifyToken, updatePassword);

module.exports = router;