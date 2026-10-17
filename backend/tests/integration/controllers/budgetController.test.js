const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const Budget = require('../../../models/Budget');
const Transaction = require('../../../models/Transaction');
const budgetController = require('../../../controllers/budgetController');
const httpStatus = require('../../../constants/httpStatus');
const { convertCurrency } = require('../../../services/currencyService');
const { createNotification } = require('../../../controllers/notificationController');

// Mock dependencies
jest.mock('../../../models/Budget');
jest.mock('../../../models/Transaction');
jest.mock('../../../services/currencyService');
jest.mock('../../../controllers/notificationController');

// Setup Express app for testing
const app = express();
app.use(express.json());

// Mock routes
app.post('/api/budgets', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.createBudget(req, res);
});

app.get('/api/budgets', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.getBudgets(req, res);
});

app.get('/api/budgets/:id', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.getBudgetById(req, res);
});

app.put('/api/budgets/:id', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.updateBudget(req, res);
});

app.delete('/api/budgets/:id', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.deleteBudget(req, res);
});

app.get('/api/budgets/status', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.getBudgetStatus(req, res);
});

app.get('/api/budgets/trends', (req, res) => {
  req.user = { _id: 'user123' };
  budgetController.getBudgetTrends(req, res);
});

describe('Budget Controller Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Set up mock implementations
    convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) => {
      if (fromCurrency === toCurrency) return amount;
      return amount * 1.2; // Simple conversion rate for testing
    });

    createNotification.mockResolvedValue({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample data for tests
  const sampleBudget = {
    _id: 'budget123',
    user: 'user123',
    month: 'January 2025',
    totalBudget: 1000,
    spent: 500,
    currency: 'USD',
    categoryBudgets: [
      { category: 'Food', amount: 300, spent: 150 },
      { category: 'Transport', amount: 200, spent: 100 }
    ],
    alerts: {
      warning: false,
      critical: false,
      notifications: []
    },
    recommendations: {
      suggestedIncrease: 0,
      suggestedDecrease: 0
    },
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnValue({}),
  };

  const sampleTransaction = {
    _id: 'transaction123',
    user: 'user123',
    type: 'expense',
    category: 'Food',
    amount: 50,
    currency: 'USD',
    date: '2025-01-15',
    save: jest.fn().mockResolvedValue(true),
    _doc: {
      _id: 'transaction123',
      user: 'user123',
      type: 'expense',
      category: 'Food',
      amount: 50,
      currency: 'USD',
      date: '2025-01-15'
    }
  };

  // CREATE BUDGET TESTS
  describe('createBudget', () => {
    test('should successfully create a budget with valid data', async () => {
      Budget.findOne.mockResolvedValue(null);
      Budget.mockImplementation(() => ({
        ...sampleBudget,
        save: jest.fn().mockResolvedValue(sampleBudget)
      }));

      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 1000,
          categoryBudgets: [
            { category: 'Food', amount: 300 },
            { category: 'Transport', amount: 200 }
          ],
          currency: 'USD'
        });

      expect(response.status).toBe(httpStatus.CREATED);
      expect(response.body.message).toBe('Budget created successfully');
    });

    test('should return 400 if budget for this month already exists', async () => {
      Budget.findOne.mockResolvedValue(sampleBudget);

      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 1000,
          categoryBudgets: [
            { category: 'Food', amount: 300 },
            { category: 'Transport', amount: 200 }
          ],
          currency: 'USD'
        });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Budget for this month already exists.');
    });

    test('should return 400 if sum of category budgets exceeds total budget', async () => {
      Budget.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 400,
          categoryBudgets: [
            { category: 'Food', amount: 300 },
            { category: 'Transport', amount: 200 }
          ],
          currency: 'USD'
        });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Sum of category budgets exceeds total budget.');
    });

    test('should return 400 if invalid currency is provided', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 1000,
          categoryBudgets: [
            { category: 'Food', amount: 300 }
          ],
          currency: 'XYZ' // Invalid currency
        });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toContain('Invalid currency');
    });

    test('should return 400 if category budgets are not provided', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 1000,
          categoryBudgets: [], // Empty array
          currency: 'USD'
        });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Category budgets are required.');
    });

    test('should return 500 if server error occurs', async () => {
      Budget.findOne.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/budgets')
        .send({
          month: '2025-01-01',
          totalBudget: 1000,
          categoryBudgets: [{ category: 'Food', amount: 300 }],
          currency: 'USD'
        });

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error creating budget');
    });
  });

  // GET BUDGETS TESTS
  describe('getBudgets', () => {
    test('should return all budgets for the user', async () => {
      Budget.find.mockResolvedValue([sampleBudget, sampleBudget]);

      const response = await request(app).get('/api/budgets');

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toHaveLength(2);
    });

    test('should return 500 if server error occurs', async () => {
      Budget.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/budgets');

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error fetching budgets');
    });
  });

  // GET BUDGET BY ID TESTS
  describe('getBudgetById', () => {
    test('should return a specific budget by ID', async () => {
      Budget.findOne.mockResolvedValue(sampleBudget);

      const response = await request(app).get('/api/budgets/budget123');

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body._id).toBe('budget123');
    });

    test('should return 404 if budget not found', async () => {
      Budget.findOne.mockResolvedValue(null);

      const response = await request(app).get('/api/budgets/nonexistent');

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('Budget not found');
    });

    test('should return 500 if server error occurs', async () => {
      Budget.findOne.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/budgets/budget123');

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error fetching budget');
    });
  });

  // UPDATE BUDGET TESTS
  describe('updateBudget', () => {
    test('should successfully update a budget', async () => {
      Budget.findOne.mockResolvedValue({
        ...sampleBudget,
        alerts: {
          warning: false,
          critical: false,
          notifications: []
        }
      });

      const response = await request(app)
        .put('/api/budgets/budget123')
        .send({
          totalBudget: 1200,
          categoryBudgets: [
            { category: 'Food', amount: 400 },
            { category: 'Transport', amount: 300 }
          ]
        });

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.message).toBe('Budget updated successfully');
    });

    test('should return 404 if budget not found', async () => {
      Budget.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/budgets/nonexistent')
        .send({
          totalBudget: 1200,
          categoryBudgets: [
            { category: 'Food', amount: 500 },
            { category: 'Transport', amount: 300 },
            { category: 'Entertainment', amount: 400 }
          ]
        });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('Budget not found');
    });

    test('should return 400 if sum of category budgets exceeds total budget', async () => {
      Budget.findOne.mockResolvedValue(sampleBudget);

      const response = await request(app)
        .put('/api/budgets/budget123')
        .send({
          totalBudget: 500,
          categoryBudgets: [
            { category: 'Food', amount: 300 },
            { category: 'Transport', amount: 300 }
          ]
        });

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Sum of category budgets exceeds total budget.');
    });

    test('should return 500 if currency conversion fails', async () => {
      Budget.findOne.mockResolvedValue(sampleBudget);
      convertCurrency.mockRejectedValue(new Error('Currency conversion failed'));

      const response = await request(app)
        .put('/api/budgets/budget123')
        .send({
          currency: 'EUR'
        });

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error converting budget currency.');
    });

    test('should return 500 if server error occurs', async () => {
      Budget.findOne.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/budgets/budget123')
        .send({
          totalBudget: 1200
        });

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error updating budget');
    });
  });

  // DELETE BUDGET TESTS
  describe('deleteBudget', () => {
    test('should successfully delete a budget', async () => {
      Budget.findOneAndDelete.mockResolvedValue(sampleBudget);

      const response = await request(app).delete('/api/budgets/budget123');

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.message).toBe('Budget deleted successfully');
    });

    test('should return 404 if budget not found', async () => {
      Budget.findOneAndDelete.mockResolvedValue(null);

      const response = await request(app).delete('/api/budgets/nonexistent');

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('Budget not found');
    });

    test('should return 500 if server error occurs', async () => {
      Budget.findOneAndDelete.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/budgets/budget123');

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error deleting budget');
    });
  });

  // UPDATE BUDGET SPENT TESTS
  describe('updateBudgetSpent', () => {
    test('should update budget spent amounts when transaction is created', async () => {
      Budget.findOne.mockResolvedValue({
        ...sampleBudget,
        categoryBudgets: [
          { 
            category: 'Food', 
            amount: 300, 
            spent: 150,
            toObject: jest.fn().mockReturnThis()
          }
        ]
      });

      const transaction = {
        ...sampleTransaction,
        user: 'user123',
        type: 'expense',
        category: 'Food',
        amount: 50,
        currency: 'USD',
        date: new Date('2025-01-15')
      };

      await budgetController.updateBudgetSpent(transaction);

      expect(Budget.findOne).toHaveBeenCalled();
      expect(sampleBudget.save).toHaveBeenCalled();
    });

    test('should not update budget for income transactions', async () => {
      const transaction = {
        ...sampleTransaction,
        type: 'income'
      };

      await budgetController.updateBudgetSpent(transaction);

      expect(Budget.findOne).not.toHaveBeenCalled();
    });

    test('should handle missing budget for the month', async () => {
      Budget.findOne.mockResolvedValue(null);

      const transaction = {
        ...sampleTransaction,
        user: 'user123',
        type: 'expense',
        category: 'Food',
        amount: 50,
        currency: 'USD',
        date: new Date('2025-01-15')
      };

      await budgetController.updateBudgetSpent(transaction);

      expect(Budget.findOne).toHaveBeenCalled();
    });

    test('should handle missing category in budget', async () => {
      Budget.findOne.mockResolvedValue({
        ...sampleBudget,
        categoryBudgets: [
          { 
            category: 'Transport', 
            amount: 200, 
            spent: 100,
            toObject: jest.fn().mockReturnThis()
          }
        ]
      });

      const transaction = {
        ...sampleTransaction,
        user: 'user123',
        type: 'expense',
        category: 'Entertainment', // Category not in budget
        amount: 50,
        currency: 'USD',
        date: new Date('2025-01-15')
      };

      await budgetController.updateBudgetSpent(transaction);

      expect(Budget.findOne).toHaveBeenCalled();
      expect(sampleBudget.save).not.toHaveBeenCalled();
    });
  });

  // GET BUDGET STATUS TESTS
  describe('getBudgetStatus', () => {
    test('should return budget status for current month', async () => {
      Budget.findOne.mockResolvedValue(sampleBudget);
      Transaction.find.mockResolvedValue([sampleTransaction]);

      const response = await request(app).get('/api/budgets/status');

      expect(response.status).toBe(httpStatus.OK);
    });

    test('should return 404 if no budget for current month', async () => {
      Budget.findOne.mockResolvedValue(null);

      const response = await request(app).get('/api/budgets/status');

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body).toEqual({ error: 'Budget not found' });
    });

    test('should return budget status if budget exists', async () => {
      const mockBudget = {
        month: '2023-10',
        totalBudget: 1000,
        categoryBudgets: [
          { category: 'Groceries', amount: 300, spent: 150 },
          { category: 'Entertainment', amount: 200, spent: 50 },
        ],
        currency: 'USD',
      };

      Budget.findOne.mockResolvedValue(mockBudget);

      const response = await request(app).get('/api/budgets/status');

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual(expect.objectContaining({
        month: mockBudget.month,
        totalBudget: mockBudget.totalBudget,
        categoryBudgets: expect.any(Array),
        currency: mockBudget.currency,
      }));
    });
  });

  // GET BUDGET TRENDS TESTS
  /*describe('getBudgetTrends', () => {
    test('should return budget trends for the last 6 months', async () => {
        const mockBudgets = [
          {
            user: 'userId',
            month: '2025-01', // Corrected month format
            totalBudget: 1000,
            spent: 500,
            currency: 'USD',
            categoryBudgets: [
              {
                category: 'Food',
                amount: 300,
                spent: 150,
                toObject: jest.fn().mockReturnThis(),
              },
              {
                category: 'Transport',
                amount: 200,
                spent: 100,
                toObject: jest.fn().mockReturnThis(),
              },
            ],
            toObject: jest.fn().mockReturnThis(),
          },
          {
            user: 'userId',
            month: '2025-02', // Corrected month format
            totalBudget: 1200,
            spent: 600,
            currency: 'USD',
            categoryBudgets: [
              {
                category: 'Food',
                amount: 300,
                spent: 200,
                toObject: jest.fn().mockReturnThis(),
              },
              {
                category: 'Transport',
                amount: 200,
                spent: 150,
                toObject: jest.fn().mockReturnThis(),
              },
            ],
            toObject: jest.fn().mockReturnThis(),
          },
        ];
      
        Budget.find.mockResolvedValue(mockBudgets);
        convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) =>
          Promise.resolve(amount)
        );
      
        const response = await request(app)
          .get('/api/budgets/trends')
          .set('Authorization', 'Bearer token');
      
        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toHaveProperty('trends');
        expect(response.body).toHaveProperty('overview');
        expect(response.body.trends).toHaveLength(2);
        expect(response.body.overview).toHaveProperty('totalBudgeted');
        expect(response.body.overview).toHaveProperty('totalSpent');
        expect(response.body.overview).toHaveProperty('averagePercentSpent');
        expect(response.body.overview).toHaveProperty('topSpendingCategories');
        response.body.trends.forEach((trend) => {
          expect(trend).toHaveProperty('topSpendingCategories');
        });
      });
      
      test('should return 404 if no budget history found', async () => {
        Budget.find.mockResolvedValue([]);
      
        const response = await request(app).get('/api/budgets/trends');
      
        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe('No budget history found');
      });
      
      test('should return 500 if server error occurs', async () => {
        Budget.find.mockRejectedValue(new Error('Database error'));
      
        const response = await request(app).get('/api/budgets/trends');
      
        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR); // Corrected status code
        expect(response.body.error).toBe('Error fetching budget trends');
      });
  });*/
});