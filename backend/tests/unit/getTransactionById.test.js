const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const { getTransactionById } = require('../../controllers/transactionController');
const { convertCurrency } = require('../../services/currencyService');

// Mock dependencies
jest.mock('../../services/currencyService');
jest.mock('../../models/Transaction');

describe('getTransactionById', () => {
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
      query: {},
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
  test('should return a single transaction by ID', async () => {
    // Arrange
    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      currency: 'USD',
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);

    // Act
    await getTransactionById(req, res);

    // Assert
    expect(Transaction.findOne).toHaveBeenCalledWith({ _id: transactionId, user: userId });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockTransaction);
  });

  test('should return transaction converted to target currency', async () => {
    // Arrange
    req.query = { targetCurrency: 'EUR' };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      currency: 'USD',
      toObject: jest.fn().mockReturnValue({
        _id: transactionId,
        type: 'expense',
        amount: 100,
        category: 'Food',
        user: userId,
        currency: 'USD',
      }),
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);
    convertCurrency.mockResolvedValue(85); // Mock EUR conversion

    // Act
    await getTransactionById(req, res);

    // Assert
    expect(convertCurrency).toHaveBeenCalledWith(100, 'USD', 'EUR');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 85,
        currency: 'EUR',
        originalAmount: 100,
        originalCurrency: 'USD',
      })
    );
  });

  // Negative test cases
  test('should return 404 if transaction is not found', async () => {
    // Arrange
    Transaction.findOne.mockResolvedValue(null);

    // Act
    await getTransactionById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Transaction not found',
      })
    );
  });

  test('should return 400 for invalid target currency', async () => {
    // Arrange
    req.query = { targetCurrency: 'XYZ' };

    const mockTransaction = {
      _id: transactionId,
      type: 'expense',
      amount: 100,
      category: 'Food',
      user: userId,
      currency: 'USD',
    };

    Transaction.findOne.mockResolvedValue(mockTransaction);

    // Act
    await getTransactionById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Invalid target currency'),
      })
    );
  });

  test('should return 500 on server error', async () => {
    // Arrange
    Transaction.findOne.mockImplementation(() => {
      throw new Error('Database error');
    });

    // Act
    await getTransactionById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Error fetching transaction',
      })
    );
  });
});