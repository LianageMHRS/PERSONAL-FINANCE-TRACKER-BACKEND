const reportController = require('../../controllers/reportController');
const Report = require('../../models/Report');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const Budget = require('../../models/Budget');
const { convertCurrency } = require('../../services/currencyService');
const httpStatus = require('../../constants/httpStatus');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../models/Report');
jest.mock('../../models/Transaction');
jest.mock('../../models/Goal');
jest.mock('../../models/Budget');
jest.mock('../../services/currencyService');

describe('Report Controller Unit Tests', () => {
  // Sample test data
  const mockUserId = new mongoose.Types.ObjectId();
  const mockReportId = new mongoose.Types.ObjectId();
  
  const mockTransactions = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: mockUserId,
      type: 'income',
      amount: 1000,
      currency: 'USD',
      category: 'Salary',
      date: new Date('2023-05-15')
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: mockUserId,
      type: 'expense',
      amount: 300,
      currency: 'USD',
      category: 'Food',
      date: new Date('2023-05-16')
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: mockUserId,
      type: 'expense',
      amount: 500,
      currency: 'EUR',
      category: 'Housing',
      date: new Date('2023-05-17')
    }
  ];

  const mockBudgets = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: mockUserId,
      totalBudget: 2000,
      currency: 'USD',
      month: 'May 2023'
    }
  ];

  const mockGoals = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: mockUserId,
      name: 'Vacation',
      targetAmount: 5000,
      currentAmount: 2500,
      currency: 'USD'
    }
  ];

  const mockReport = {
    _id: mockReportId,
    user: mockUserId,
    currency: 'USD',
    startDate: new Date('2023-05-01'),
    endDate: new Date('2023-05-31'),
    totalIncome: 1000,
    totalExpenses: 800,
    totalBudget: 2000,
    remainingBudget: 1200,
    breakdown: [
      { category: 'Salary', income: 1000, expenses: 0 },
      { category: 'Food', income: 0, expenses: 300 },
      { category: 'Housing', income: 0, expenses: 500 }
    ],
    goalProgress: [
      {
        goalId: mockGoals[0]._id,
        goalName: 'Vacation',
        targetAmount: 5000,
        currentAmount: 2500,
        progressPercentage: '50.00'
      }
    ],
    significantTransactions: []
  };

  let req, res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Common request and response objects
    req = {
      user: { _id: mockUserId },
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set up default mock behavior
    Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
    Budget.find = jest.fn().mockResolvedValue(mockBudgets);
    Goal.find = jest.fn().mockResolvedValue(mockGoals);
    
    // Mock currency conversion
    convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) => {
      if (fromCurrency === 'EUR' && toCurrency === 'USD') {
        return amount * 1.1; // EUR to USD
      } else if (fromCurrency === 'USD' && toCurrency === 'EUR') {
        return amount * 0.9; // USD to EUR
      }
      return amount; // Same currency
    });
    
    // Mock Report constructor and save method
    const mockSave = jest.fn().mockResolvedValue(mockReport);
    Report.mockImplementation(() => ({
      save: mockSave
    }));
    
    // Mock Report.find
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockReport])
    });
    
    // Mock Report.findOne
    Report.findOne = jest.fn().mockResolvedValue(mockReport);
  });

  describe('generateReport', () => {
    beforeEach(() => {
      req.body = {
        startDate: '2023-05-01',
        endDate: '2023-05-31',
        currency: 'USD'
      };
    });

    test('should check for required parameters', async () => {
      // Test missing startDate
      req.body = { endDate: '2023-05-31', currency: 'USD' };
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ error: "Start date, end date, and currency are required." });
      
      // Test missing endDate
      req.body = { startDate: '2023-05-01', currency: 'USD' };
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      
      // Test missing currency
      req.body = { startDate: '2023-05-01', endDate: '2023-05-31' };
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    });

    test('should validate currency', async () => {
      req.body.currency = 'XYZ'; // Invalid currency
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid currency. Allowed: USD, EUR, LKR, GBP, INR." });
    });

    test('should validate date format', async () => {
      req.body.startDate = 'invalid-date';
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid date format." });
    });

    test('should validate date range', async () => {
      req.body.startDate = '2023-06-01';
      req.body.endDate = '2023-05-01';
      await reportController.generateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ error: "Start date must be before end date." });
    });

    

    test('should fetch budgets for the report period', async () => {
      await reportController.generateReport(req, res);
      expect(Budget.find).toHaveBeenCalledWith({
        user: mockUserId,
        month: 'May 2023' // Format should match your implementation
      });
    });

    test('should fetch all user goals', async () => {
      await reportController.generateReport(req, res);
      expect(Goal.find).toHaveBeenCalledWith({ user: mockUserId });
    });

    test('should convert transactions to target currency', async () => {
      await reportController.generateReport(req, res);
      // There should be a call to convert the EUR transaction to USD
      expect(convertCurrency).toHaveBeenCalledWith(500, 'EUR', 'USD');
    });

    test('should handle database errors', async () => {
      // Mock a database error in Transaction.find
      Transaction.find = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await reportController.generateReport(req, res);
      
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: "Error generating report" });
    });

    test('should handle currency conversion errors', async () => {
      // Mock a currency conversion error
      convertCurrency.mockImplementation(() => {
        throw new Error('Currency conversion failed');
      });
      
      await reportController.generateReport(req, res);
      
      // The controller should log the error but still complete successfully
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
    });

    test('should handle empty transaction list', async () => {
      Transaction.find = jest.fn().mockResolvedValue([]);
      
      await reportController.generateReport(req, res);
      
      expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        message: "Report generated successfully",
        report: expect.any(Object)
      });
    });
  });

});