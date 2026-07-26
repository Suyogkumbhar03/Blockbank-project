const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    verifyPin,
    verifyPaymentId,
    transferMoney,
    getTransactionHistory
} = require('../controllers/transferController');

// All transfer routes require authentication
router.use(verifyToken);

router.post('/verify-pin', verifyPin);
router.get('/verify/:paymentId', verifyPaymentId);
router.post('/', transferMoney);
router.get('/history', getTransactionHistory);

module.exports = router;
