const httpStatus = require('../../constants/httpStatus');
const budgetController = require('../../controllers/budgetController');
const Budget = require('../../models/Budget');
const { convertCurrency } = require('../../services/currencyService');

// Mock dependencies
jest.mock('../../models/Budget');
jest.mock('../../services/currencyService');

describe('createBudget', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'user123' },
      body: {
        month: '2025-01-01',
        totalBudget: 1000,
        categoryBudgets: [
          { category: 'Food', amount: 300 },
          { category: 'Transport', amount: 200 }
        ],
        currency: 'USD'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  test('should return 400 if budget for the month already exists', async () => {
    Budget.findOne.mockResolvedValue({}); // Simulate existing budget

    await budgetController.createBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Budget for this month already exists.' });
  });

  test('should return 500 if server error occurs', async () => {
    Budget.findOne.mockRejectedValue(new Error('Database error'));

    await budgetController.createBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error creating budget' });
  });
});