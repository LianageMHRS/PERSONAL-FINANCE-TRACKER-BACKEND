const mongoose = require('mongoose');
const httpStatus = require('../../../constants/httpStatus');

// Mock dependencies
jest.mock('../../../models/Report');
jest.mock('../../../models/Transaction');
jest.mock('../../../models/Goal');
jest.mock('../../../models/Budget');
jest.mock('../../../services/currencyService');

// Import the controller under test
const reportController = require('../../../controllers/reportController');

// Import mocked models and services
const Report = require('../../../models/Report');
const Transaction = require('../../../models/Transaction');
const Goal = require('../../../models/Goal');
const Budget = require('../../../models/Budget');
const { convertCurrency } = require('../../../services/currencyService');

// Sample data for testing
const mockUser = { _id: new mongoose.Types.ObjectId() };

const mockTransactions = [
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    type: 'income',
    amount: 1000,
    currency: 'USD',
    category: 'Salary',
    date: new Date('2023-05-15')
  },
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    type: 'expense',
    amount: 300,
    currency: 'USD',
    category: 'Food',
    date: new Date('2023-05-16')
  },
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
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
    user: mockUser._id,
    totalBudget: 2000,
    currency: 'USD',
    month: 'May 2023'
  }
];

const mockGoals = [
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    name: 'Vacation',
    targetAmount: 5000,
    currentAmount: 2500,
    currency: 'USD'
  }
];

const mockReport = {
  _id: new mongoose.Types.ObjectId(),
  user: mockUser._id,
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

describe('ReportController - generateReport', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: mockUser,
      body: {
        startDate: '2023-05-01',
        endDate: '2023-05-31',
        currency: 'USD'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup mock implementations
    Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
    Budget.find = jest.fn().mockResolvedValue(mockBudgets);
    Goal.find = jest.fn().mockResolvedValue(mockGoals);
    convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) => {
      if (fromCurrency === 'EUR' && toCurrency === 'USD') {
        return amount * 1.1; // Simulate EUR to USD conversion
      }
      return amount; // Default to same amount if same currency
    });
    
    // Mock Report.prototype.save
    const mockSave = jest.fn().mockResolvedValue(mockReport);
    Report.mockImplementation(() => {
      return {
        save: mockSave
      };
    });
  });

  // POSITIVE TEST CASES
  test('should successfully generate a financial report', async () => {
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(Transaction.find).toHaveBeenCalledWith({
      user: mockUser._id,
      date: { $gte: expect.any(Date), $lte: expect.any(Date) }
    });
    
    expect(Budget.find).toHaveBeenCalledWith({
      user: mockUser._id,
      month: expect.any(String)
    });
    
    expect(Goal.find).toHaveBeenCalledWith({ user: mockUser._id });
    
    expect(convertCurrency).toHaveBeenCalledWith(500, 'EUR', 'USD');
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      message: "Report generated successfully",
      report: expect.any(Object)
    });
  });

  test('should properly convert currencies for transactions', async () => {
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Verify that convertCurrency was called with the correct parameters
    expect(convertCurrency).toHaveBeenCalledWith(500, 'EUR', 'USD');
  });

  test('should handle empty transaction list', async () => {
    // Mock empty transactions
    Transaction.find = jest.fn().mockResolvedValue([]);
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      message: "Report generated successfully",
      report: expect.any(Object)
    });
  });

  // NEGATIVE TEST CASES
  test('should return 400 if startDate is missing', async () => {
    // Remove startDate from request
    req.body = { endDate: '2023-05-31', currency: 'USD' };
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Start date, end date, and currency are required." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should return 400 if endDate is missing', async () => {
    // Remove endDate from request
    req.body = { startDate: '2023-05-01', currency: 'USD' };
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Start date, end date, and currency are required." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should return 400 if currency is missing', async () => {
    // Remove currency from request
    req.body = { startDate: '2023-05-01', endDate: '2023-05-31' };
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Start date, end date, and currency are required." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should return 400 if currency is invalid', async () => {
    // Set invalid currency
    req.body.currency = 'XYZ';
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid currency. Allowed: USD, EUR, LKR, GBP, INR." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should return 400 if date format is invalid', async () => {
    // Set invalid date format
    req.body.startDate = 'invalid-date';
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid date format." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should return 400 if start date is after end date', async () => {
    // Set start date after end date
    req.body.startDate = '2023-06-01';
    req.body.endDate = '2023-05-01';
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Start date must be before end date." });
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  test('should handle currency conversion errors gracefully', async () => {
    // Mock currency conversion error
    convertCurrency.mockImplementation(() => {
      throw new Error('Currency conversion failed');
    });
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // The controller should still complete successfully even with currency conversion errors
    expect(console.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
  });

  test('should handle database errors gracefully', async () => {
    // Mock a database error
    const dbError = new Error('Database connection lost');
    Transaction.find = jest.fn().mockRejectedValue(dbError);
    
    // Execute the controller
    await reportController.generateReport(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('❌ Error generating report:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: "Error generating report" });
  });
});

describe('ReportController - getReports', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: mockUser
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup Report.find mock implementation
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockReport])
    });
  });

  // POSITIVE TEST CASES
  test('should successfully retrieve all reports for a user', async () => {
    // Execute the controller
    await reportController.getReports(req, res);
    
    // Assertions
    expect(Report.find).toHaveBeenCalledWith({ user: mockUser._id });
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith([mockReport]);
  });

  test('should return an empty array when no reports exist', async () => {
    // Mock empty result
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    });
    
    // Execute the controller
    await reportController.getReports(req, res);
    
    // Assertions
    expect(Report.find).toHaveBeenCalledWith({ user: mockUser._id });
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  // NEGATIVE TEST CASES
  test('should handle database errors gracefully', async () => {
    // Mock a database error
    const dbError = new Error('Database connection lost');
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockRejectedValue(dbError)
    });
    
    // Execute the controller
    await reportController.getReports(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('❌ Error fetching reports:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: "Error fetching reports" });
  });
});

describe('ReportController - getReportById', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: mockUser,
      params: { id: mockReport._id.toString() },
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup mock for Report.findOne
    Report.findOne = jest.fn().mockResolvedValue({
      ...mockReport,
      currency: 'USD',
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
    });
  });

  // POSITIVE TEST CASES
  test('should successfully retrieve a report by ID', async () => {
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(Report.findOne).toHaveBeenCalledWith({ 
      _id: mockReport._id.toString(), 
      user: mockUser._id 
    });
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      _id: mockReport._id,
      user: mockUser._id,
      currency: 'USD'
    }));
  });

  test('should convert report to target currency if specified', async () => {
    // Set target currency
    req.query.targetCurrency = 'EUR';
    
    // Setup currency conversion
    convertCurrency.mockImplementation((amount, fromCurrency, toCurrency) => {
      if (fromCurrency === 'USD' && toCurrency === 'EUR') {
        return amount * 0.9; // Simulate USD to EUR conversion
      }
      return amount;
    });
    
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(convertCurrency).toHaveBeenCalledWith(1000, 'USD', 'EUR'); // Check income conversion
    expect(convertCurrency).toHaveBeenCalledWith(800, 'USD', 'EUR'); // Check expenses conversion
    expect(convertCurrency).toHaveBeenCalledWith(2000, 'USD', 'EUR'); // Check budget conversion
    expect(convertCurrency).toHaveBeenCalledWith(1200, 'USD', 'EUR'); // Check remaining budget conversion
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR'
    }));
  });

  // NEGATIVE TEST CASES
  test('should return 404 if report is not found', async () => {
    // Mock report not found
    Report.findOne = jest.fn().mockResolvedValue(null);
    
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
  });

  test('should return 400 if target currency is invalid', async () => {
    // Set invalid target currency
    req.query.targetCurrency = 'XYZ';
    
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid target currency." });
  });

  test('should handle currency conversion errors gracefully', async () => {
    // Set valid target currency but mock conversion error
    req.query.targetCurrency = 'EUR';
    
    // Mock currency conversion error
    const conversionError = new Error('API rate limit exceeded');
    convertCurrency.mockRejectedValue(conversionError);
    
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('❌ Error converting report currency:', conversionError.message);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error converting currency values",
      details: conversionError.message
    });
  });

  test('should handle database errors gracefully', async () => {
    // Mock a database error
    const dbError = new Error('Database connection lost');
    Report.findOne = jest.fn().mockRejectedValue(dbError);
    
    // Execute the controller
    await reportController.getReportById(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('❌ Error fetching report:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: "Error fetching report" });
  });
});