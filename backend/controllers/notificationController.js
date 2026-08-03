const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(20);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Verify ownership
        if (notification.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied: not your notification' });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server error marking notification as read', error: error.message });
    }
};

module.exports = {
    getNotifications,
    markNotificationAsRead
};
