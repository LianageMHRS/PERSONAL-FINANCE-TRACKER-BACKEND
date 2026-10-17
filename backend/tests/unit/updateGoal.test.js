const mongoose = require('mongoose');
const Goal = require('../../models/Goal');
const goalController = require('../../controllers/goalController');

// Mock the Goal model
jest.mock('../../models/Goal');

describe('getGoalById', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('should return a goal by id', async () => {
    const mockGoal = { _id: req.params.id, name: "Test Goal", user: req.user._id };
    Goal.findOne.mockResolvedValue(mockGoal);

    await goalController.getGoalById(req, res);

    expect(Goal.findOne).toHaveBeenCalledWith({ _id: req.params.id, user: req.user._id });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockGoal);
  });

  test('should return 404 if goal not found', async () => {
    Goal.findOne.mockResolvedValue(null);

    await goalController.getGoalById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Goal not found"
    });
  });

  test('should return 500 if database error occurs', async () => {
    Goal.findOne.mockRejectedValue(new Error("Database error"));

    await goalController.getGoalById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error fetching goal"
    });
  });
});