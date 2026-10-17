const mongoose = require('mongoose');
const httpStatus = require('../../constants/httpStatus');

// Mock dependencies
jest.mock('../../models/SystemSettings');
jest.mock('../../middleware/authMiddleware');

// Import the controller under test
const systemSettingsController = require('../../controllers/systemSettingsController');

// Sample data
const mockAdmin = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
const mockNonAdmin = { _id: new mongoose.Types.ObjectId(), role: 'user' };

const mockCategoryLimits = [
  {
    _id: new mongoose.Types.ObjectId(),
    category: 'food',
    spendingLimit: 500
  },
  {
    _id: new mongoose.Types.ObjectId(),
    category: 'entertainment',
    spendingLimit: 300
  },
  {
    _id: new mongoose.Types.ObjectId(),
    category: 'transportation',
    spendingLimit: 200
  }
];

describe('SystemSettingsController - getCategoryLimits', () => {
  let req, res;
  const SystemSettings = require('../../models/SystemSettings');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: mockAdmin
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // POSITIVE TEST CASES
  test('should successfully retrieve all category limits', async () => {
    // Mock the database response
    SystemSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCategoryLimits)
    });
    
    // Execute the controller
    await systemSettingsController.getCategoryLimits(req, res);
    
    // Assertions
    expect(SystemSettings.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ categoryLimits: mockCategoryLimits });
  });
  
  test('should return an empty array when no category limits exist', async () => {
    // Mock empty database response
    SystemSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });
    
    // Execute the controller
    await systemSettingsController.getCategoryLimits(req, res);
    
    // Assertions
    expect(SystemSettings.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ categoryLimits: [] });
  });
  
  // NEGATIVE TEST CASES
  test('should return 403 if user is not authenticated', async () => {
    // Remove user from request
    req.user = null;
    
    // Execute the controller
    await systemSettingsController.getCategoryLimits(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied. Admins only." });
    expect(SystemSettings.find).not.toHaveBeenCalled();
  });
  
  test('should return 403 if user is not an admin', async () => {
    // Set a non-admin user
    req.user = mockNonAdmin;
    
    // Execute the controller
    await systemSettingsController.getCategoryLimits(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied. Admins only." });
    expect(SystemSettings.find).not.toHaveBeenCalled();
  });
  
  test('should handle database errors gracefully', async () => {
    // Mock a database error
    const dbError = new Error('Database connection lost');
    SystemSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockRejectedValue(dbError)
    });
    
    // Execute the controller
    await systemSettingsController.getCategoryLimits(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('Error fetching category limits:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: "Error fetching category limits." });
  });
});