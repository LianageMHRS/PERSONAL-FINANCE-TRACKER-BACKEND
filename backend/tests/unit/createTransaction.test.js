const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const SystemSettings = require('../../models/SystemSettings');
const { createTransaction } = require('../../controllers/transactionController');
const { convertCurrency } = require('../../services/currencyService');
const { updateBudgetSpent } = require('../../controllers/budgetController');
const { createNotification } = require('../../controllers/notificationController');

// Mock dependencies
jest.mock('../../services/currencyService');
jest.mock('../../controllers/budgetController');
jest.mock('../../controllers/notificationController');
jest.mock('../../models/Transaction');
jest.mock('../../models/Budget');
jest.mock('../../models/SystemSettings');

describe('createTransaction', () => {
  let req, res;
  const userId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      user: { _id: userId },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Reset converted currency mock
    convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) => {
      return Promise.resolve(amount); // Default: return the same amount
    });
  });

  // Positive test cases
  test('should create a valid expense transaction', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 100,
      category: 'Food',
      date: '2023-10-10',
      currency: 'USD',
    };

    const mockTransaction = {
      _id: transactionId,
      ...req.body,
      user: userId,
      date: new Date('2023-10-10'),
      save: jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue({
          _id: transactionId,
          ...req.body,
          user: userId,
        }),
      }),
      toObject: jest.fn().mockReturnValue({
        _id: transactionId,
        ...req.body,
        user: userId,
      }),
    };

    Transaction.mockImplementation(() => mockTransaction);
    SystemSettings.findOne.mockResolvedValue(null);
    Budget.findOne.mockResolvedValue({
      user: userId,
      totalBudget: 1000,
      currency: 'USD',
      categoryBudgets: [],
      save: jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue({
          user: userId,
          totalBudget: 1000,
          currency: 'USD',
          categoryBudgets: [],
        }),
      }),
    });

    convertCurrency.mockResolvedValue(100);
    updateBudgetSpent.mockResolvedValue(true);
    createNotification.mockResolvedValue(true);

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Transaction added successfully',
      })
    );
  });

  test('should create a valid income transaction', async () => {
    // Arrange
    req.body = {
      type: 'income',
      amount: 1000,
      category: 'Salary',
      date: '2023-10-01',
      currency: 'USD',
    };

    const mockTransaction = {
      _id: transactionId,
      ...req.body,
      user: userId,
      date: new Date('2023-10-01'),
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: transactionId,
        ...req.body,
        user: userId,
      }),
    };

    Transaction.mockImplementation(() => mockTransaction);

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Transaction added successfully',
      })
    );
  });

  test('should create a transaction with recurring settings', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 200,
      category: 'Rent',
      date: '2023-10-15',
      currency: 'USD',
      recurring: {
        isRecurring: true,
        frequency: 'monthly',
        endDate: '2024-10-15',
      },
    };

    const mockTransaction = {
      _id: transactionId,
      ...req.body,
      user: userId,
      date: new Date('2023-10-15'),
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: transactionId,
        ...req.body,
        user: userId,
      }),
    };

    Transaction.mockImplementation(() => mockTransaction);
    SystemSettings.findOne.mockResolvedValue(null);

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: expect.objectContaining({
          recurring: expect.objectContaining({
            isRecurring: true,
            frequency: 'monthly',
          }),
        }),
      })
    );
  });

  test('should issue notification when transaction exceeds 50% of budget', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 600,
      category: 'Food',
      currency: 'USD',
    };

    const mockTransaction = {
      _id: transactionId,
      ...req.body,
      user: userId,
      date: new Date(),
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: transactionId,
        ...req.body,
        user: userId,
      }),
    };

    Transaction.mockImplementation(() => mockTransaction);
    SystemSettings.findOne.mockResolvedValue(null);

    // Mock budget that's less than double the transaction
    Budget.findOne.mockResolvedValue({
      user: userId,
      totalBudget: 1000,
      currency: 'USD',
      month: 'October 2023',
    });

    // Act
    await createTransaction(req, res);

    // Assert
    expect(createNotification).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Negative test cases
  test('should return 400 if required fields are missing', async () => {
    // Arrange - missing amount
    req.body = {
      type: 'expense',
      category: 'Food',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Missing required fields.',
      })
    );
  });

  test('should return 400 for invalid transaction type', async () => {
    // Arrange
    req.body = {
      type: 'investment', // Invalid type
      amount: 100,
      category: 'Food',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Invalid transaction type. Must be 'income' or 'expense'.",
      })
    );
  });

  test('should return 400 for negative amount', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: -50,
      category: 'Food',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid amount. Must be a positive number.',
      })
    );
  });

  test('should return 400 for invalid category', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 100,
      category: 'InvalidCategory',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid category.',
      })
    );
  });

  test('should return 400 if tags is not an array', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 100,
      category: 'Food',
      tags: 'not an array',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Tags must be an array.',
      })
    );
  });

  test('should return 400 for invalid date format', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 100,
      category: 'Food',
      date: 'invalid-date',
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid date format.',
      })
    );
  });

  test('should return 400 if transaction exceeds category spending limit', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 300,
      category: 'Food',
      currency: 'USD',
    };

    // Mock spending limit
    SystemSettings.findOne.mockResolvedValue({
      category: 'food',
      spendingLimit: 200,
    });

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('exceeds the spending limit'),
      })
    );
  });

  test('should return 400 for invalid currency', async () => {
    // Arrange
    req.body = {
      type: 'expense',
      amount: 100,
      category: 'Food',
      currency: 'XYZ', // Invalid currency
    };

    // Act
    await createTransaction(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Invalid currency'),
      })
    );
  });

});