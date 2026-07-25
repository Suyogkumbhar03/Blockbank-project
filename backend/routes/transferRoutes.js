const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    verifyPaymentId,
    transferMoney,
    getTransactionHistory
} = require('../controllers/transferController');

// All transfer routes require authentication
router.use(verifyToken);

router.get('/verify/:paymentId', verifyPaymentId);
router.post('/', transferMoney);
router.get('/history', getTransactionHistory);

module.exports = router;
