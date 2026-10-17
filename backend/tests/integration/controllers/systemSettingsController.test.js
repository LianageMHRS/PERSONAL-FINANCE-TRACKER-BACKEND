const mongoose = require('mongoose');
const httpStatus = require('../../../constants/httpStatus');

// Mock dependencies
jest.mock('../../../models/SystemSettings');
jest.mock('../../../middleware/authMiddleware');

// Import the controller under test
const systemSettingsController = require('../../../controllers/systemSettingsController');

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

describe('SystemSettingsController - setCategoryLimit', () => {
  let req, res;
  const SystemSettings = require('../../../models/SystemSettings');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: mockAdmin,
      body: {
        category: 'Food',
        spendingLimit: 500
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // POSITIVE TEST CASES
  test('should successfully create a new category limit', async () => {
    // Mock the database response for a new category
    const newCategoryLimit = {
      _id: new mongoose.Types.ObjectId(),
      category: 'food',
      spendingLimit: 500
    };
    
    SystemSettings.findOneAndUpdate = jest.fn().mockResolvedValue(newCategoryLimit);
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { category: 'food' },
      { spendingLimit: 500 },
      { new: true, upsert: true }
    );
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({
      message: "Spending limit for 'Food' updated successfully",
      setting: newCategoryLimit
    });
  });
  
  test('should update an existing category limit', async () => {
    // Mock the database response for updating an existing category
    const updatedCategoryLimit = {
      _id: mockCategoryLimits[0]._id,
      category: 'food',
      spendingLimit: 600 // Updated limit
    };
    
    SystemSettings.findOneAndUpdate = jest.fn().mockResolvedValue(updatedCategoryLimit);
    
    // Update request
    req.body.spendingLimit = 600;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { category: 'food' },
      { spendingLimit: 600 },
      { new: true, upsert: true }
    );
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({
      message: "Spending limit for 'Food' updated successfully",
      setting: updatedCategoryLimit
    });
  });
  
  test('should normalize category names to lowercase', async () => {
    const categoryLimit = {
      _id: new mongoose.Types.ObjectId(),
      category: 'entertainment',
      spendingLimit: 300
    };
    
    SystemSettings.findOneAndUpdate = jest.fn().mockResolvedValue(categoryLimit);
    
    // Set a mixed-case category name
    req.body.category = 'EnTerTaiNment';
    req.body.spendingLimit = 300;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { category: 'entertainment' },
      { spendingLimit: 300 },
      { new: true, upsert: true }
    );
    
    expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
  });
  
  // NEGATIVE TEST CASES
  test('should return 403 if user is not authenticated', async () => {
    // Remove user from request
    req.user = null;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied. Admins only." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 403 if user is not an admin', async () => {
    // Set a non-admin user
    req.user = mockNonAdmin;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied. Admins only." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 400 if category is missing', async () => {
    // Remove category from request
    req.body = { spendingLimit: 500 };
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Category is required and must be a string." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 400 if category is not a string', async () => {
    // Set an invalid category type
    req.body.category = 123;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Category is required and must be a string." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 400 if spending limit is missing', async () => {
    // Remove spending limit from request
    req.body = { category: 'Food' };
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Spending limit must be a positive number." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 400 if spending limit is not a number', async () => {
    // Set an invalid spending limit
    req.body.spendingLimit = "500";
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Spending limit must be a positive number." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should return 400 if spending limit is zero or negative', async () => {
    // Set a negative spending limit
    req.body.spendingLimit = -100;
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: "Spending limit must be a positive number." });
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  test('should handle database errors gracefully', async () => {
    // Mock a database error
    const dbError = new Error('Database connection lost');
    SystemSettings.findOneAndUpdate = jest.fn().mockRejectedValue(dbError);
    
    // Execute the controller
    await systemSettingsController.setCategoryLimit(req, res);
    
    // Assertions
    expect(console.error).toHaveBeenCalledWith('Error updating category limit:', dbError);
    expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ 
      error: "Error updating category limit. Please try again later." 
    });
  });
});

describe('SystemSettingsController - getCategoryLimits', () => {
  let req, res;
  const SystemSettings = require('../../../models/SystemSettings');

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