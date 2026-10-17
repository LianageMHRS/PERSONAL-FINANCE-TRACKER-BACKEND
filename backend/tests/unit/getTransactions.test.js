const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const { getTransactions } = require('../../controllers/transactionController');
const { convertCurrency } = require('../../services/currencyService');

// Mock dependencies
jest.mock('../../services/currencyService');
jest.mock('../../models/Transaction');

describe('getTransactions', () => {
  let req, res;
  const userId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      user: { _id: userId },
      params: {},
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
  test('should return all transactions for a user', async () => {
    // Arrange
    const mockTransactions = [
      { _id: transactionId, type: 'expense', amount: 100, category: 'Food', user: userId },
      { _id: new mongoose.Types.ObjectId(), type: 'income', amount: 1000, category: 'Salary', user: userId },
    ];

    Transaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockTransactions),
    });

    // Act
    await getTransactions(req, res);

    // Assert
    expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({ user: userId }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockTransactions);
  });

  test('should filter transactions by category', async () => {
    // Arrange
    req.query = { category: 'Food' };

    Transaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    // Act
    await getTransactions(req, res);

    // Assert
    expect(Transaction.find).toHaveBeenCalledWith(
      expect.objectContaining({
        user: userId,
        category: 'Food',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should filter transactions by date range', async () => {
    // Arrange
    req.query = {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    };

    Transaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    // Act
    await getTransactions(req, res);

    // Assert
    expect(Transaction.find).toHaveBeenCalledWith(
      expect.objectContaining({
        user: userId,
        date: {
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        },
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should sort transactions by amount', async () => {
    // Arrange
    req.query = { sortBy: 'amount' };

    Transaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    // Act
    await getTransactions(req, res);

    // Assert
    expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({ user: userId }));
    expect(Transaction.find().sort).toHaveBeenCalledWith({ amount: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should convert transactions to target currency', async () => {
    // Arrange
    req.query = { targetCurrency: 'EUR' };

    const mockTransactions = [
      {
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
      },
    ];

    Transaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockTransactions),
    });

    convertCurrency.mockResolvedValue(85); // Mock EUR conversion

    // Act
    await getTransactions(req, res);

    // Assert
    expect(convertCurrency).toHaveBeenCalledWith(100, 'USD', 'EUR');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 85,
          currency: 'EUR',
          originalAmount: 100,
          originalCurrency: 'USD',
        }),
      ])
    );
  });

  // Negative test cases
  test('should return 400 for invalid target currency', async () => {
    // Arrange
    req.query = { targetCurrency: 'XYZ' };

    // Act
    await getTransactions(req, res);

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
    Transaction.find.mockImplementation(() => {
      throw new Error('Database error');
    });

    // Act
    await getTransactions(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Error fetching transactions',
      })
    );
  });
});