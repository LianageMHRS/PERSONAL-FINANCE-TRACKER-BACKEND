const express = require('express');
const {
    createGoal,
    getGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    addSavingsToGoal
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware'); // Correct middleware import

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Goals
 *   description: Manage financial goals
 */

/**
 * @swagger
 * /api/goals:
 *   post:
 *     summary: Create a new financial goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               targetAmount:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *               autoAllocate:
 *                 type: boolean
 *               allocationPercentage:
 *                 type: number
 *     responses:
 *       201:
 *         description: Goal created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', protect, createGoal);

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: Get all financial goals for the authenticated user
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of goals
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getGoals);

/**
 * @swagger
 * /api/goals/{id}:
 *   get:
 *     summary: Get a specific financial goal by ID
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal details
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', protect, getGoalById);

/**
 * @swagger
 * /api/goals/{id}:
 *   put:
 *     summary: Update an existing financial goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', protect, updateGoal);

/**
 * @swagger
 * /api/goals/{id}:
 *   delete:
 *     summary: Delete a financial goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal deleted successfully
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', protect, deleteGoal);

/**
 * @swagger
 * /api/goals/{id}/savings:
 *   post:
 *     summary: Add savings to a financial goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Savings added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/savings', protect, addSavingsToGoal);

module.exports = router;
