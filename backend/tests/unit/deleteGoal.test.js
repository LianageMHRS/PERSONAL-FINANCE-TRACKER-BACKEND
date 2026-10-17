const httpStatus = require('../../constants/httpStatus');
const budgetController = require('../../controllers/budgetController');
const Budget = require('../../models/Budget');

// Mock dependencies
jest.mock('../../models/Budget');

describe('deleteBudget', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'user123' },
      params: { id: 'budget123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  test('should delete a budget successfully', async () => {
    Budget.findOneAndDelete.mockResolvedValue({ _id: 'budget123' });

    await budgetController.deleteBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget deleted successfully' });
  });

  test('should return 404 if budget not found', async () => {
    Budget.findOneAndDelete.mockResolvedValue(null);

    await budgetController.deleteBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ error: 'Budget not found' });
  });

  test('should return 500 if server error occurs', async () => {
    Budget.findOneAndDelete.mockRejectedValue(new Error('Database error'));

    await budgetController.deleteBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error deleting budget' });
  });
});