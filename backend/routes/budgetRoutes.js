const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    createBudget,
    getBudgets,
    getBudgetById,
    updateBudget,
    deleteBudget,
    getBudgetStatus,
    getBudgetTrends,
    updateBudgetSpent
} = require('../controllers/budgetController');

const router = express.Router();

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - totalBudget
 *               - categoryBudgets
 *             properties:
 *               month:
 *                 type: string
 *                 example: "March 2025"
 *               totalBudget:
 *                 type: number
 *                 example: 1000
 *               categoryBudgets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       example: "Food"
 *                     amount:
 *                       type: number
 *                       example: 200
 *     responses:
 *       201:
 *         description: Budget created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/', protect, createBudget);

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Get all budgets for the logged-in user
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all user budgets
 */
router.get('/', protect, getBudgets);

/**
 * @swagger
 * /api/budgets/status:
 *   get:
 *     summary: Get budget status for the current month
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget status including alerts and recommendations
 *       404:
 *         description: No budget found for current month
 */
router.get('/status', protect, getBudgetStatus);

/**
 * @swagger
 * /api/budgets/trends:
 *   get:
 *     summary: Analyze spending trends & provide budget recommendations
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget recommendations generated
 */
router.get('/trends', protect, getBudgetTrends);

/**
 * @swagger
 * /api/budgets/update-spent:
 *   patch:
 *     summary: Update budget spent amount when a transaction is added or modified
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction
 *             properties:
 *               transaction:
 *                 type: object
 *                 example:
 *                   user: "userId"
 *                   type: "expense"
 *                   amount: 100
 *                   category: "Food"
 *                   date: "2025-03-15T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *       400:
 *         description: Invalid transaction data
 */
router.patch('/update-spent', protect, async (req, res) => {
    try {
        const { transaction } = req.body;
        if (!transaction || !transaction.amount || !transaction.category || !transaction.date) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid transaction data" });
        }
        await updateBudgetSpent(transaction);
        res.status(httpStatus.OK).json({ message: "Budget updated successfully" });
    } catch (error) {
        console.error("Error updating budget spent:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating budget spent" });
    }
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   get:
 *     summary: Get a budget by ID
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget details
 *       404:
 *         description: Budget not found
 */
router.get('/:id', protect, getBudgetById);

/**
 * @swagger
 * /api/budgets/{id}:
 *   put:
 *     summary: Update an existing budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalBudget:
 *                 type: number
 *                 example: 1200
 *               categoryBudgets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       example: "Transport"
 *                     amount:
 *                       type: number
 *                       example: 150
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *       404:
 *         description: Budget not found
 */
router.put('/:id', protect, updateBudget);

/**
 * @swagger
 * /api/budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget ID to delete
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *       404:
 *         description: Budget not found
 */
router.delete('/:id', protect, deleteBudget);



module.exports = router;
