const adminController = require('../../controllers/adminController');
const User = require('../../models/User');
const httpStatus = require('../../constants/httpStatus');

// Mock the User model
jest.mock('../../models/User');

describe('Admin Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mocks before each test

    // Mock request object
    req = {
      user: { _id: 'admin123', role: 'admin' }, // Simulate an admin user
      params: {},
      body: {}
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(), // Mock the status function
      json: jest.fn() // Mock the json function
    };
  });

  describe('getAllUsers', () => {
    test('should get all users successfully', async () => {
      // Mock data for users
      const mockUsers = [
        { _id: 'user1', name: 'User One', email: 'user1@example.com', role: 'user' },
        { _id: 'user2', name: 'User Two', email: 'user2@example.com', role: 'user' }
      ];

      // Mock User.find to return the mock users
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers)
      });

      // Call the controller function
      await adminController.getAllUsers(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    test('should handle database errors gracefully', async () => {
      // Mock User.find to throw an error
      const dbError = new Error('Database error');
      User.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(dbError)
      });

      // Call the controller function
      await adminController.getAllUsers(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error fetching users' });
    });
  });

  describe('getUserById', () => {
    test('should get a user by ID successfully', async () => {
      // Mock data for a user
      const mockUser = { _id: 'user1', name: 'User One', email: 'user1@example.com', role: 'user' };
      req.params.id = 'user1'; // Set the user ID in the request params

      // Mock User.findById to return the mock user
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      // Call the controller function
      await adminController.getUserById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    test('should return 404 if user is not found', async () => {
      req.params.id = 'nonexistent'; // Set a non-existent user ID

      // Mock User.findById to return null (user not found)
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      // Call the controller function
      await adminController.getUserById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

});