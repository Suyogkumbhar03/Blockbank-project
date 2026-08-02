const express = require('express');
const router = express.Router();
const { getPendingUsers, getApprovedUsers, getRejectedUsers, approveUser, rejectUser, getAdminProfile, updateAdminProfile, getAllTransactions } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, isAdmin, getAdminProfile);
router.put('/profile', verifyToken, isAdmin, updateAdminProfile);
router.get('/pending-users', verifyToken, isAdmin, getPendingUsers);
router.get('/approved-users', verifyToken, isAdmin, getApprovedUsers);
router.get('/rejected-users', verifyToken, isAdmin, getRejectedUsers);
router.get('/transactions', verifyToken, isAdmin, getAllTransactions);
router.get('/all-transactions', verifyToken, isAdmin, getAllTransactions);
router.put('/approve/:id', verifyToken, isAdmin, approveUser);
router.put('/reject/:id', verifyToken, isAdmin, rejectUser);

module.exports = router;

