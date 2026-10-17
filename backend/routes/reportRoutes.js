const express = require('express');
const { generateReport, getReports, getReportById } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Generate and view financial reports
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Generate a financial report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Report generated successfully
 */
router.post('/', protect, generateReport);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports for the authenticated user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved reports
 */
router.get('/', protect, getReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a specific financial report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Successfully retrieved the report
 */
router.get('/:id', protect, getReportById);

module.exports = router;
