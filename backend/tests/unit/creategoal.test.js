const mongoose = require('mongoose');
const Goal = require('../../models/Goal');
const goalController = require('../../controllers/goalController');

// Mock the Goal model
jest.mock('../../models/Goal');

describe('createGoal', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  test('should return 400 if name is missing', async () => {
    req.body = {
      targetAmount: 1000,
      currency: "USD"
    };

    await goalController.createGoal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("required")
    });
  });

  test('should return 500 if database error occurs', async () => {
    req.body = {
      name: "Vacation",
      targetAmount: 1000,
      currency: "USD"
    };

    Goal.prototype.save = jest.fn().mockRejectedValue(new Error("Database error"));

    await goalController.createGoal(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});