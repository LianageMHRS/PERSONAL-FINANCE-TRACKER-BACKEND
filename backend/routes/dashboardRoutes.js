const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { getAdminDashboard, getUserDashboard } = require('../controllers/dashboardController');

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/admin:
 *   get:
 *     summary: Get Admin Dashboard (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data
 */
router.get('/admin', protect, admin, getAdminDashboard);

/**
 * @swagger
 * /api/dashboard/user:
 *   get:
 *     summary: Get User Dashboard (User only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard data
 */
router.get('/user', protect, getUserDashboard);

module.exports = router;
