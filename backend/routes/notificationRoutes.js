const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getNotifications, markNotificationAsRead } = require('../controllers/notificationController');

// All notification routes require authentication
router.use(verifyToken);

router.get('/', getNotifications);
router.put('/:id/read', markNotificationAsRead);

module.exports = router;
