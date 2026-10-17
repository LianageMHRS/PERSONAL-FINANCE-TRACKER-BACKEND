const Notification = require('../models/Notification');
const httpStatus = require('../constants/httpStatus');

/**
 * 📌 Create a new notification
 */
exports.createNotification = async (userId, type, title, message, severity = 'info', relatedId = null, relatedModel = null) => {
    try {
        const notification = new Notification({
            user: userId,
            type,
            title,
            message,
            severity,
            relatedId,
            relatedModel
        });

        await notification.save();
        console.log(`✅ Notification created: ${title}`);
    } catch (error) {
        console.error("❌ Error creating notification:", error);
    }
};

/**
 * 📌 Get notifications for a user
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });

        res.status(httpStatus.OK).json(notifications);
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching notifications" });
    }
};

/**
 * 📌 Mark a notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Notification not found" });
        }

        res.status(httpStatus.OK).json({ message: "Notification marked as read", notification });
    } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error marking notification as read" });
    }
};

/**
 * 📌 Delete old notifications manually (if needed)
 */
exports.deleteNotification = async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        res.status(httpStatus.OK).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting notification:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error deleting notification" });
    }
};
