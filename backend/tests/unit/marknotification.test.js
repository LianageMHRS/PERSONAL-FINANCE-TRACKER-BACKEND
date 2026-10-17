const notificationController = require('../../controllers/notificationController');
const Notification = require('../../models/Notification');
const httpStatus = require('../../constants/httpStatus');
const mongoose = require('mongoose');

// Mock console methods to prevent cluttering test output
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock Notification model
jest.mock('../../models/Notification');

describe('Notification Controller Unit Tests', () => {
  let req, res;
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockNotificationId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      user: { _id: mockUserId },
      params: { id: mockNotificationId },
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  // Tests for createNotification
  describe('createNotification', () => {
    
  // Tests for markNotificationAsRead
  describe('markNotificationAsRead', () => {
    test('should mark a notification as read', async () => {
      // Mock data
      const mockNotification = { 
        _id: mockNotificationId, 
        isRead: true,
        title: 'Test Notification'
      };
      
      // Setup mock
      Notification.findOneAndUpdate.mockResolvedValue(mockNotification);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockNotificationId, user: mockUserId },
        { isRead: true },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification marked as read',
        notification: mockNotification
      });
    });

    test('should return 404 if notification is not found', async () => {
      // Setup mock to return null
      Notification.findOneAndUpdate.mockResolvedValue(null);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ error: 'Notification not found' });
    });
    
    test('should handle errors when marking notification as read', async () => {
      // Setup mock to throw error
      const mockError = new Error('Database error');
      Notification.findOneAndUpdate.mockRejectedValue(mockError);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error marking notification as read:'),
        mockError
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error marking notification as read' });
    });
  });
  
  });
});