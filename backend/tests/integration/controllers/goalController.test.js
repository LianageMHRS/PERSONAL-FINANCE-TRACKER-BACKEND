const mongoose = require('mongoose');
const request = require('supertest');
const Goal = require('../../../models/Goal');
const Transaction = require('../../../models/Transaction');
const { createNotification } = require('../../../controllers/notificationController');
const { convertCurrency } = require('../../../services/currencyService');

// Mock dependencies
jest.mock('../../../controllers/notificationController');
jest.mock('../../../services/currencyService');
jest.mock('../../../models/Goal');
jest.mock('../../../models/Transaction');

// Sample data
const mockUser = { _id: new mongoose.Types.ObjectId() };
const mockGoal = {
  _id: new mongoose.Types.ObjectId(),
  user: mockUser._id,
  name: "Test Goal",
  targetAmount: 1000,
  currentAmount: 500,
  currency: "USD",
  deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days in the future
  autoAllocate: true,
  allocationPercentage: 10,
  reminderSent: false,
  save: jest.fn().mockResolvedValue(true)
};

let req, res;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Setup request and response objects
  req = {
    user: mockUser,
    params: { id: mockGoal._id.toString() },
    body: {}
  };
  
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
});

// Import the controller under test
const goalController = require('../../../controllers/goalController');

describe('Goal Controller Tests', () => {
  
  /*
   * createGoal Tests
   */
  describe('createGoal', () => {
    // Positive test cases
    test('should create a goal with valid data', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 2000,
        currency: "USD",
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        autoAllocate: true,
        allocationPercentage: 20
      };
      
      Goal.prototype.save = jest.fn().mockResolvedValue({
        ...req.body,
        _id: new mongoose.Types.ObjectId(),
        user: mockUser._id
      });
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Goal created successfully",
          goal: expect.any(Object)
        })
      );
      expect(Goal.prototype.save).toHaveBeenCalled();
    });
    
    test('should create a goal with minimum required fields', async () => {
      // Setup
      req.body = {
        name: "Emergency Fund",
        targetAmount: 5000,
        currency: "USD"
      };
      
      Goal.prototype.save = jest.fn().mockResolvedValue({
        ...req.body,
        _id: new mongoose.Types.ObjectId(),
        user: mockUser._id,
        autoAllocate: false,
        allocationPercentage: 0
      });
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(Goal.prototype.save).toHaveBeenCalled();
    });
    
    // Negative test cases
    test('should return 400 if name is missing', async () => {
      // Setup
      req.body = {
        targetAmount: 1000,
        currency: "USD"
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("required")
        })
      );
    });
    
    test('should return 400 if targetAmount is missing', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        currency: "USD"
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should return 400 if currency is missing', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should return 400 if targetAmount is not a positive number', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: -500,
        currency: "USD"
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("positive number")
        })
      );
    });
    
    test('should return 400 if deadline is in the past', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "USD",
        deadline: new Date(Date.now() - 1000 * 60 * 60 * 24) // Yesterday
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("past")
        })
      );
    });
    
    test('should return 400 if deadline is invalid', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "USD",
        deadline: "not-a-date"
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid date")
        })
      );
    });
    
    test('should return 400 if currency is invalid', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "XYZ"  // Invalid currency
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid currency")
        })
      );
    });
    
    test('should return 400 if autoAllocate is true but allocationPercentage is invalid', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "USD",
        autoAllocate: true,
        allocationPercentage: 0  // Invalid percentage (0 or below)
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("between 1 and 100")
        })
      );
    });
    
    test('should return 400 if autoAllocate is true but allocationPercentage > 100', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "USD",
        autoAllocate: true,
        allocationPercentage: 150  // Over 100%
      };
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("between 1 and 100")
        })
      );
    });
    
    test('should return 500 if database error occurs', async () => {
      // Setup
      req.body = {
        name: "Vacation",
        targetAmount: 1000,
        currency: "USD"
      };
      
      Goal.prototype.save = jest.fn().mockRejectedValue(new Error("Database error"));
      
      // Execute
      await goalController.createGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  /*
   * getGoals Tests
   */
  describe('getGoals', () => {
    // Positive test cases
    test('should return all goals for the user', async () => {
      // Setup
      const goals = [
        { ...mockGoal },
        { 
          _id: new mongoose.Types.ObjectId(),
          user: mockUser._id,
          name: "Another Goal",
          targetAmount: 5000,
          currentAmount: 1000,
          currency: "EUR"
        }
      ];
      
      Goal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(goals)
      });
      
      // Execute
      await goalController.getGoals(req, res);
      
      // Assert
      expect(Goal.find).toHaveBeenCalledWith({ user: mockUser._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(goals);
    });
    
    test('should return empty array if user has no goals', async () => {
      // Setup
      Goal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      
      // Execute
      await goalController.getGoals(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
    
    // Negative test cases
    test('should return 500 if database error occurs', async () => {
      // Setup
      Goal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("Database error"))
      });
      
      // Execute
      await goalController.getGoals(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Error fetching goals")
        })
      );
    });
  });
  
  /*
   * getGoalById Tests
   */
  describe('getGoalById', () => {
    // Positive test cases
    test('should return a goal by id', async () => {
      // Setup
      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);
      
      // Execute
      await goalController.getGoalById(req, res);
      
      // Assert
      expect(Goal.findOne).toHaveBeenCalledWith({ 
        _id: mockGoal._id.toString(), 
        user: mockUser._id 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockGoal);
    });
    
    // Negative test cases
    test('should return 404 if goal not found', async () => {
      // Setup
      Goal.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await goalController.getGoalById(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Goal not found"
        })
      );
    });
    
    test('should return 500 if database error occurs', async () => {
      // Setup
      Goal.findOne = jest.fn().mockRejectedValue(new Error("Database error"));
      
      // Execute
      await goalController.getGoalById(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Error fetching goal"
        })
      );
    });
  });
  
  /*
   * updateGoal Tests
   */
  describe('updateGoal', () => {
    beforeEach(() => {
      Goal.findOne = jest.fn().mockResolvedValue({
        ...mockGoal,
        save: jest.fn().mockResolvedValue(true)
      });
    });

    // Positive test cases
    test('should update a goal with valid data', async () => {
      // Setup
      req.body = {
        name: "Updated Goal",
        targetAmount: 1500
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(Goal.findOne).toHaveBeenCalledWith({ 
        _id: mockGoal._id.toString(), 
        user: mockUser._id 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Goal updated successfully"
        })
      );
    });
    
    test('should update deadline if valid', async () => {
      // Setup
      req.body = {
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60) // 60 days in future
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should send notification if goal becomes achieved after update', async () => {
      // Setup
      const goalInstance = {
        ...mockGoal,
        targetAmount: 1000,
        currentAmount: 900,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.findOne = jest.fn().mockResolvedValue(goalInstance);
      req.body = {
        targetAmount: 800 // Lowering the target makes the goal achieved
      };
      
      createNotification.mockResolvedValue(true);
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(createNotification).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should reset reminderSent if goal becomes unachieved after update', async () => {
      // Setup
      const goalInstance = {
        ...mockGoal,
        targetAmount: 500, // Goal is achieved
        currentAmount: 500,
        reminderSent: true,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.findOne = jest.fn().mockResolvedValue(goalInstance);
      req.body = {
        targetAmount: 1000 // Increasing target makes goal unachieved
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(goalInstance.reminderSent).toBe(false);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    // Negative test cases
    test('should return 404 if goal not found', async () => {
      // Setup
      Goal.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Goal not found"
        })
      );
    });
    
    test('should return 400 if name is invalid', async () => {
      // Setup
      req.body = {
        name: 123 // Not a string
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("string")
        })
      );
    });
    
    test('should return 400 if targetAmount is invalid', async () => {
      // Setup
      req.body = {
        targetAmount: -100 // Negative amount
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("positive number")
        })
      );
    });
    
    test('should return 400 if deadline is in the past', async () => {
      // Setup
      req.body = {
        deadline: new Date(Date.now() - 1000 * 60 * 60 * 24) // Yesterday
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("past")
        })
      );
    });
    
    test('should return 400 if deadline is invalid', async () => {
      // Setup
      req.body = {
        deadline: "not-a-date"
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid date")
        })
      );
    });
    
    test('should return 400 if trying to change currency', async () => {
      // Setup
      req.body = {
        currency: "EUR" // Different from original USD
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Cannot change currency")
        })
      );
    });
    
    test('should return 400 if autoAllocate is invalid', async () => {
      // Setup
      req.body = {
        autoAllocate: "yes" // Not a boolean
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("boolean")
        })
      );
    });
    
    test('should return 400 if allocationPercentage is invalid', async () => {
      // Setup
      req.body = {
        allocationPercentage: 150 // Over 100%
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("between 1 and 100")
        })
      );
    });
    
    test('should return 500 if database error occurs', async () => {
      // Setup
      const error = new Error("Database error");
      Goal.findOne = jest.fn().mockResolvedValue({
        ...mockGoal,
        save: jest.fn().mockRejectedValue(error)
      });
      
      req.body = {
        name: "Updated Goal"
      };
      
      // Execute
      await goalController.updateGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Error updating goal"
        })
      );
    });
  });
  
  /*
   * deleteGoal Tests
   */
  describe('deleteGoal', () => {
    // Positive test cases
    test('should delete a goal', async () => {
      // Setup
      Goal.findOneAndDelete = jest.fn().mockResolvedValue(mockGoal);
      
      // Execute
      await goalController.deleteGoal(req, res);
      
      // Assert
      expect(Goal.findOneAndDelete).toHaveBeenCalledWith({ 
        _id: mockGoal._id.toString(), 
        user: mockUser._id 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Goal deleted successfully"
        })
      );
    });
    
    // Negative test cases
    test('should return 404 if goal not found', async () => {
      // Setup
      Goal.findOneAndDelete = jest.fn().mockResolvedValue(null);
      
      // Execute
      await goalController.deleteGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Goal not found"
        })
      );
    });
    
    test('should return 500 if database error occurs', async () => {
      // Setup
      Goal.findOneAndDelete = jest.fn().mockRejectedValue(new Error("Database error"));
      
      // Execute
      await goalController.deleteGoal(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Error deleting goal"
        })
      );
    });
  });
  
  /*
   * updateGoalProgress Tests
   */
  describe('updateGoalProgress', () => {
    // Setup mock transaction
    const mockTransaction = {
      _id: new mongoose.Types.ObjectId(),
      user: mockUser._id,
      type: "income",
      amount: 1000,
      currency: "USD",
      category: "Salary",
      date: new Date()
    };
    
    beforeEach(() => {
      Goal.find = jest.fn().mockResolvedValue([{
        ...mockGoal,
        save: jest.fn().mockResolvedValue(true)
      }]);
      
      convertCurrency.mockResolvedValue(100); // 10% of 1000 USD
      createNotification.mockResolvedValue(true);
    });
    
    // Positive test cases
    test('should update goal progress from income transaction', async () => {
      // Execute
      await goalController.updateGoalProgress(mockTransaction);
      
      // Assert
      expect(Goal.find).toHaveBeenCalledWith({ 
        user: mockUser._id, 
        autoAllocate: true 
      });
    });
    
    test('should send notification if goal becomes achieved after update', async () => {
      // Setup
      const almostAchievedGoal = {
        ...mockGoal,
        currentAmount: 900, // 90% achieved
        targetAmount: 1000,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.find = jest.fn().mockResolvedValue([almostAchievedGoal]);
      
      // Execute
      await goalController.updateGoalProgress(mockTransaction);
      
      // Assert
      expect(createNotification).toHaveBeenCalled();
    });
    
    test('should handle currency conversion if transaction currency differs from goal', async () => {
      // Setup
      const eurTransaction = {
        ...mockTransaction,
        currency: "EUR"
      };
      
      // Execute
      await goalController.updateGoalProgress(eurTransaction);
      
      // Assert
      expect(convertCurrency).toHaveBeenCalled();
    });
    
    test('should not exceed target amount', async () => {
      // Setup
      const almostAchievedGoal = {
        ...mockGoal,
        currentAmount: 950, // 95% achieved
        targetAmount: 1000,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.find = jest.fn().mockResolvedValue([almostAchievedGoal]);
      
      // Execute
      await goalController.updateGoalProgress(mockTransaction);
      
      // Assert
      expect(almostAchievedGoal.currentAmount).toBeLessThanOrEqual(almostAchievedGoal.targetAmount);
    });
    
    // Negative test cases
    test('should skip non-income transactions', async () => {
      // Setup
      const expenseTransaction = {
        ...mockTransaction,
        type: "expense"
      };
      
      // Execute
      await goalController.updateGoalProgress(expenseTransaction);
      
      // Assert
      expect(Goal.find).not.toHaveBeenCalled();
    });
    
    test('should skip already achieved goals', async () => {
      // Setup
      const achievedGoal = {
        ...mockGoal,
        currentAmount: 1000,
        targetAmount: 1000,
        reminderSent: true,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.find = jest.fn().mockResolvedValue([achievedGoal]);
      
      // Execute
      await goalController.updateGoalProgress(mockTransaction);
      
      // Assert
      expect(achievedGoal.currentAmount).toBe(1000); // Should remain unchanged
    });
    
    test('should send notification for previously achieved goal if reminder not sent', async () => {
      // Setup
      const achievedButNotNotifiedGoal = {
        ...mockGoal,
        currentAmount: 1000,
        targetAmount: 1000,
        reminderSent: false,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.find = jest.fn().mockResolvedValue([achievedButNotNotifiedGoal]);
      
      // Execute
      await goalController.updateGoalProgress(mockTransaction);
      
      // Assert
      expect(createNotification).toHaveBeenCalled();
      expect(achievedButNotNotifiedGoal.reminderSent).toBe(true);
    });
    
    test('should handle currency conversion errors', async () => {
      // Setup
      convertCurrency.mockRejectedValue(new Error("Conversion failed"));
      
      const eurTransaction = {
        ...mockTransaction,
        currency: "EUR"
      };
      
      // Execute
      await goalController.updateGoalProgress(eurTransaction);
      
      // Assert - should not throw and should skip this goal processing
      expect(mockGoal.save).not.toHaveBeenCalled();
    });
  });
  
  /*
   * addSavingsToGoal Tests
   */
  describe('addSavingsToGoal', () => {
    beforeEach(() => {
      Goal.findOne = jest.fn().mockResolvedValue({
        ...mockGoal,
        save: jest.fn().mockResolvedValue(true)
      });
      
      Transaction.create = jest.fn().mockResolvedValue({});
      convertCurrency.mockResolvedValue(100);
    });
    
    // Positive test cases
    test('should add savings to goal with valid amount', async () => {
      // Setup
      req.body = {
        amount: 200,
        currency: "USD"
      };
      
      // Execute
      await goalController.addSavingsToGoal(req, res);
      
      // Assert
      expect(Goal.findOne).toHaveBeenCalledWith({ 
        _id: mockGoal._id.toString(), 
        user: mockUser._id 
      });
      expect(Transaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Savings added successfully"
        })
      );
    });
    
    test('should convert currency if savings currency differs from goal', async () => {
      // Setup
      req.body = {
        amount: 200,
        currency: "EUR"  // Different from goal's USD
      };
      
      // Execute
      await goalController.addSavingsToGoal(req, res);
      
      // Assert
      expect(convertCurrency).toHaveBeenCalledWith(200, "EUR", "USD");
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should send notification if goal becomes achieved after adding savings', async () => {
      // Setup
      const almostAchievedGoal = {
        ...mockGoal,
        currentAmount: 900,
        targetAmount: 1000,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Goal.findOne = jest.fn().mockResolvedValue(almostAchievedGoal);
      req.body = {
        amount: 200,
        currency: "USD"
      };
      
      // Execute
      await goalController.addSavingsToGoal(req, res);
      
      // Assert
      expect(createNotification).toHaveBeenCalled();
      expect(almostAchievedGoal.reminderSent).toBe(true);
    });
    
    test('should return 400 if goal is already achieved', async () => {
        // Setup
        const achievedGoal = {
          ...mockGoal,
          currentAmount: 1000,
          targetAmount: 1000,
          save: jest.fn().mockResolvedValue(true)
        };
  
        Goal.findOne = jest.fn().mockResolvedValue(achievedGoal);
        req.body = {
          amount: 200,
          currency: "USD"
        };
  
        // Execute
        await goalController.addSavingsToGoal(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining("Goal already achieved")
          })
        );
      });
  
      test('should return 400 if amount is zero or negative', async () => {
        // Setup
        req.body = {
          amount: -100,
          currency: "USD"
        };
  
        // Execute
        await goalController.addSavingsToGoal(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining("greater than zero")
          })
        );
      });
  
      test('should return 500 if database error occurs', async () => {
        // Setup
        Goal.findOne = jest.fn().mockRejectedValue(new Error("Database error"));
        req.body = {
          amount: 200,
          currency: "USD"
        };
  
        // Execute
        await goalController.addSavingsToGoal(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Error updating goal"
          })
        );
      });
  
      test('should return 500 if currency conversion fails', async () => {
        // Setup
        convertCurrency.mockRejectedValue(new Error("Conversion failed"));
        req.body = {
          amount: 200,
          currency: "EUR"
        };
  
        // Execute
        await goalController.addSavingsToGoal(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Currency conversion failed."
          })
        );
      });
    });
  });