const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

const router = express.Router();

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', protect, createTransaction);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions for the user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', protect, getTransactions);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', protect, getTransactionById);

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', protect, updateTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', protect, deleteTransaction);

module.exports = router;
