const express = require("express");
const { setCategoryLimit, getCategoryLimits } = require("../controllers/systemSettingsController");
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/admin/category-limit:
 *   post:
 *     summary: Set or update a category spending limit (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 example: Food
 *               spendingLimit:
 *                 type: number
 *                 example: 500
 *     responses:
 *       200:
 *         description: Spending limit updated successfully
 *       403:
 *         description: Access denied
 */
router.post("/category-limit", protect, admin, setCategoryLimit);

/**
 * @swagger
 * /api/admin/category-limits:
 *   get:
 *     summary: Get all category spending limits (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all category spending limits
 *       403:
 *         description: Access denied
 */
router.get("/category-limits", protect, admin, getCategoryLimits);


module.exports = router;