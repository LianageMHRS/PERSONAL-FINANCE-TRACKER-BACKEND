const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser, 
    getAdminProfile // ✅ Importing new function
} = require('../controllers/adminController');

const router = express.Router();

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get Admin Profile (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *       403:
 *         description: Access denied, admin only
 *       404:
 *         description: Admin profile not found
 */
router.get('/profile', protect, admin, getAdminProfile); // ✅ New route for Admin Profile

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/users', protect, admin, getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:id', protect, admin, getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user details (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid request
 */
router.put('/users/:id', protect, admin, updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;
