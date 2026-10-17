const authController = require('../../controllers/authController');
const User = require('../../models/User');
const httpStatus = require('../../constants/httpStatus');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../models/User');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('Auth Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mocks before each test

    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  })
   
  describe('login', () => {
    test('should login successfully with correct credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'Test@123'
      };

      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user'
      };

      User.findOne.mockResolvedValue(mockUser); // Mock user lookup
      bcrypt.compare.mockResolvedValue(true); // Mock password comparison
      jwt.sign.mockReturnValue('test-token'); // Mock token generation

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        token: 'test-token',
        role: 'user',
        message: 'User logged in successfully' // Match the actual message
      });
    });

    test('should return error when password is incorrect', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user'
      };

      User.findOne.mockResolvedValue(mockUser); // Mock user lookup
      bcrypt.compare.mockResolvedValue(false); // Mock incorrect password

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email or password'
      });
    });
  });
});