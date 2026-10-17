const express = require('express');
const {
    getNotifications,
    markNotificationAsRead,
    deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware'); // Correctly import the protect function

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Manage user notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved notifications
 *       401:
 *         description: Unauthorized - Token is missing or invalid
 */
router.get('/', getNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized - Token is missing or invalid
 */
router.patch('/:id/read', markNotificationAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID to delete
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized - Token is missing or invalid
 */
router.delete('/:id', deleteNotification);

module.exports = router;