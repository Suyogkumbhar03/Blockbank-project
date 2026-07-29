const express = require('express');
const router = express.Router();
const { getPendingUsers, getApprovedUsers, approveUser, rejectUser, getAdminProfile, updateAdminProfile } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, isAdmin, getAdminProfile);
router.put('/profile', verifyToken, isAdmin, updateAdminProfile);
router.get('/pending-users', verifyToken, isAdmin, getPendingUsers);
router.get('/approved-users', verifyToken, isAdmin, getApprovedUsers);
router.put('/approve/:id', verifyToken, isAdmin, approveUser);
router.put('/reject/:id', verifyToken, isAdmin, rejectUser);

module.exports = router;

