const budgetController = require('../../controllers/budgetController');
const Budget = require('../../models/Budget');
const mongoose = require('mongoose');

jest.mock('../../models/Budget');

describe('updateBudgetSpent', () => {
  let transaction;

  beforeEach(() => {
    transaction = {
      user: new mongoose.Types.ObjectId(), // Ensure ObjectId format
      type: 'expense',
      category: 'Food',
      amount: 50,
      currency: 'USD',
      date: new Date('2025-01-15')
    };
    jest.clearAllMocks();
  });

  test('should update budget spent amounts for an expense transaction', async () => {
    const mockBudget = {
      _id: new mongoose.Types.ObjectId(),
      user: transaction.user,
      month: '2025-01',
      categoryBudgets: [
        { category: 'Food', amount: 300, spent: 150, save: jest.fn() }
      ],
      alerts: { warning: false }, // Ensure alerts exist
      save: jest.fn().mockResolvedValue(true)
    };
    Budget.findOne.mockResolvedValue(mockBudget);

    await budgetController.updateBudgetSpent(transaction);

    expect(Budget.findOne).toHaveBeenCalled();
    expect(mockBudget.save).toHaveBeenCalled();
  });

  test('should not update budget for income transactions', async () => {
    transaction.type = 'income';

    await budgetController.updateBudgetSpent(transaction);

    expect(Budget.findOne).not.toHaveBeenCalled();
  });

  test('should handle missing budget for the month', async () => {
    Budget.findOne.mockResolvedValue(null);

    await budgetController.updateBudgetSpent(transaction);

    expect(Budget.findOne).toHaveBeenCalled();
  });

  test('should handle missing category in budget', async () => {
    const mockBudget = {
      _id: new mongoose.Types.ObjectId(),
      user: transaction.user,
      month: '2025-01',
      categoryBudgets: [
        { category: 'Transport', amount: 200, spent: 100, save: jest.fn() }
      ],
      alerts: { warning: false }, // Ensure alerts exist
      save: jest.fn().mockResolvedValue(true)
    };
    Budget.findOne.mockResolvedValue(mockBudget);

    await budgetController.updateBudgetSpent(transaction);

    expect(Budget.findOne).toHaveBeenCalled();
    expect(mockBudget.save).not.toHaveBeenCalled();
  });

});
