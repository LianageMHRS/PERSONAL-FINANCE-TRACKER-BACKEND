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
  // Tests for deleteNotification
  describe('deleteNotification', () => {
    test('should delete a notification successfully', async () => {
      // Mock data
      const mockNotification = { _id: mockNotificationId };
      
      // Setup mock
      Notification.findOneAndDelete.mockResolvedValue(mockNotification);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockNotificationId,
        user: mockUserId
      });
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
    });

    test('should handle case when notification does not exist', async () => {
      // Setup mock to return null
      Notification.findOneAndDelete.mockResolvedValue(null);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
    });
    
    test('should handle errors when deleting notification', async () => {
      // Setup mock to throw error
      const mockError = new Error('Database error');
      Notification.findOneAndDelete.mockRejectedValue(mockError);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error deleting notification:'),
        mockError
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error deleting notification' });
    });
  });
  
  
});