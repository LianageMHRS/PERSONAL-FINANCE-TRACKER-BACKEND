const mongoose = require('mongoose');
const Goal = require('../../models/Goal');
const goalController = require('../../controllers/goalController');

// Mock the Goal model
jest.mock('../../models/Goal');

describe('getGoals', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: new mongoose.Types.ObjectId() }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('should return all goals for the user', async () => {
    const mockGoals = [
      { _id: new mongoose.Types.ObjectId(), name: "Goal 1", user: req.user._id },
      { _id: new mongoose.Types.ObjectId(), name: "Goal 2", user: req.user._id }
    ];

    Goal.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockGoals)
    });

    await goalController.getGoals(req, res);

    expect(Goal.find).toHaveBeenCalledWith({ user: req.user._id });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockGoals);
  });

  test('should return 500 if database error occurs', async () => {
    Goal.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error("Database error"))
    });

    await goalController.getGoals(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error fetching goals"
    });
  });
});