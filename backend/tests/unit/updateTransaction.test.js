const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const { updateTransaction } = require('../../controllers/transactionController');
const { updateGoalProgress } = require('../../controllers/goalController');

// Mock dependencies
jest.mock('../../controllers/goalController');
jest.mock('../../models/Transaction');
jest.mock('../../models/Goal');

describe('updateTransaction', () => {
  let req, res;
  const userId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      user: { _id: userId },
      params: { id: transactionId },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // Positive test cases
  test('should update a transaction successfully', async () => {
    // Arrange
    req.body = {
      amount: 150,
      category: 'Food',
    };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Transport',
      user: userId,
      date: new Date(),
      currency: 'USD',
      tags: ['old-tag'],
      save: jest.fn().mockResolvedValue(true),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);
    Transaction.distinct.mockResolvedValue([]);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(mockTransaction.amount).toBe(150);
    expect(mockTransaction.category).toBe('Food');
    expect(mockTransaction.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Transaction updated successfully',
      })
    );
  });

  test('should update transaction type from expense to income', async () => {
    // Arrange
    req.body = {
      type: 'income',
      category: 'Salary',
    };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Transport',
      user: userId,
      date: new Date(),
      currency: 'USD',
      tags: [],
      save: jest.fn().mockResolvedValue(true),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);
    Goal.find.mockResolvedValue([]);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(mockTransaction.type).toBe('income');
    expect(mockTransaction.category).toBe('Salary');
    expect(updateGoalProgress).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Negative test cases
  test('should return 404 if transaction not found', async () => {
    // Arrange
    Transaction.findOne.mockResolvedValue(null);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Transaction not found',
      })
    );
  });

  test('should return 400 for invalid transaction type', async () => {
    // Arrange
    req.body = {
      type: 'invalid',
    };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      date: new Date(),
      currency: 'USD',
      tags: [],
      save: jest.fn(),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid transaction type.',
      })
    );
  });

  test('should return 400 for negative amount', async () => {
    // Arrange
    req.body = {
      amount: -50,
    };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      date: new Date(),
      currency: 'USD',
      tags: [],
      save: jest.fn(),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid amount.',
      })
    );
  });

  test('should return 400 for invalid category', async () => {
    // Arrange
    req.body = {
      category: 'InvalidCategory',
    };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      date: new Date(),
      currency: 'USD',
      tags: [],
      save: jest.fn(),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);

    // Act
    await updateTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid category.',
      })
    );
  });
});