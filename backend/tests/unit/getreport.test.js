const reportController = require('../../controllers/reportController');
const Report = require('../../models/Report');
const httpStatus = require('../../constants/httpStatus');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../models/Report');

describe('Report Controller Unit Tests - getReports', () => {
  // Sample test data
  const mockUserId = new mongoose.Types.ObjectId();
  const mockReportId = new mongoose.Types.ObjectId();
  
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
        goalId: new mongoose.Types.ObjectId(),
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
      user: { _id: mockUserId }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock Report.find
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockReport])
    });
  });

  test('should fetch all reports for user', async () => {
    await reportController.getReports(req, res);
    
    expect(Report.find).toHaveBeenCalledWith({ user: mockUserId });
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith([mockReport]);
  });

  test('should handle empty results', async () => {
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    });
    
    await reportController.getReports(req, res);
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('should handle database errors', async () => {
    const dbError = new Error('Database error');
    Report.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockRejectedValue(dbError)
    });
    
    await reportController.getReports(req, res);
    
    expect(console.error).toHaveBeenCalledWith('❌ Error fetching reports:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: "Error fetching reports" });
  });
});