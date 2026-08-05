const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        if (req.user && req.user.role === 'admin') {
            try {
                const { validateChainInternal } = require('./blockchainController');
                if (validateChainInternal) {
                    await validateChainInternal(req.user.id);
                }
            } catch (bcErr) {
                console.error('Failed to sync blockchain validation notifications for admin:', bcErr);
            }

            try {
                const User = require('../models/User');
                const pendingUsers = await User.find({ status: 'pending' });
                for (const pUser of pendingUsers) {
                    const exists = await Notification.findOne({
                        userId: req.user.id,
                        type: 'user_registered',
                        message: { $regex: pUser.email, $options: 'i' }
                    });
                    if (!exists) {
                        const notif = new Notification({
                            userId: req.user.id,
                            message: `New user registration request: "${pUser.name}" (${pUser.email}) is pending admin approval.`,
                            type: 'user_registered'
                        });
                        await notif.save();
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync pending registration notifications for admin:', syncErr);
            }
        }

        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(30);
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
