const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    verifyPin,
    verifyPaymentId,
    transferMoney,
    cancelTransfer,
    getTransactionHistory,
    getMyFraudAlerts,
    selfFreezeAccount,
    getDailySpending
} = require('../controllers/transferController');

// All transfer routes require authentication
router.use(verifyToken);

router.post('/verify-pin', verifyPin);
router.get('/verify/:paymentId', verifyPaymentId);
router.post('/', transferMoney);
router.post('/cancel', cancelTransfer);
router.get('/history', getTransactionHistory);
router.get('/daily-spending', getDailySpending);
router.get('/spending', getDailySpending);
router.get('/fraud-alerts', getMyFraudAlerts);
router.post('/self-freeze', selfFreezeAccount);

module.exports = router;
