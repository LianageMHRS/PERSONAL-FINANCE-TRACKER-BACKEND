const mongoose = require('mongoose');
const httpStatus = require('../../../constants/httpStatus');

// Mock dependencies
jest.mock('../../../models/Notification');
jest.mock('../../../middleware/authMiddleware');

// Import the controller under test
const notificationController = require('../../../controllers/notificationController');

// Sample data
const mockUser = { _id: new mongoose.Types.ObjectId() };
const mockNotifications = [
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    title: 'Test Notification 1',
    message: 'This is test notification message 1',
    type: 'budget_alert',
    severity: 'info',
    isRead: false,
    createdAt: new Date('2023-01-01')
  },
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    title: 'Test Notification 2',
    message: 'This is test notification message 2',
    type: 'transaction_alert',
    severity: 'warning',
    isRead: true,
    createdAt: new Date('2023-01-02')
  },
  {
    _id: new mongoose.Types.ObjectId(),
    user: mockUser._id,
    title: 'Test Notification 3',
    message: 'This is test notification message 3',
    type: 'goal_alert',
    severity: 'critical',
    isRead: false,
    createdAt: new Date('2023-01-03')
  }
];

let req, res;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Setup request and response objects
  req = {
    user: mockUser,
    params: { id: mockNotifications[0]._id.toString() },
    body: {}
  };
  
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  
  // Setup console spy to capture logs
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('Notification Controller Tests', () => {
  // Tests for createNotification function
  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      // Mock the Notification constructor and save method
      const saveMock = jest.fn().mockResolvedValue(true);
      const Notification = require('../../../models/Notification');
      Notification.mockImplementation(() => ({
        save: saveMock
      }));
      
      // Call the function
      await notificationController.createNotification(
        mockUser._id,
        'budget_alert',
        'Test Notification',
        'This is a test notification',
        'warning',
        new mongoose.Types.ObjectId(),
        'Budget'
      );
      
      // Assertions
      expect(Notification).toHaveBeenCalledWith({
        user: mockUser._id,
        type: 'budget_alert',
        title: 'Test Notification',
        message: 'This is a test notification',
        severity: 'warning',
        relatedId: expect.any(Object),
        relatedModel: 'Budget'
      });
      expect(saveMock).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Notification created'));
    });
    
    it('should handle errors when creating notification', async () => {
      // Mock the Notification constructor to throw an error
      const Notification = require('../../../models/Notification');
      Notification.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Test error'))
      }));
      
      // Call the function
      await notificationController.createNotification(
        mockUser._id,
        'budget_alert',
        'Test Notification',
        'This is a test notification'
      );
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error creating notification:'),
        expect.any(Error)
      );
    });
  });
  
  // Tests for getNotifications endpoint
  describe('getNotifications', () => {
    it('should fetch all notifications for the authenticated user', async () => {
      // Mock Notification.find().sort()
      const Notification = require('../../../models/Notification');
      const sortMock = jest.fn().mockResolvedValue(mockNotifications);
      Notification.find.mockReturnValue({
        sort: sortMock
      });
      
      // Call the controller method
      await notificationController.getNotifications(req, res);
      
      // Assertions
      expect(Notification.find).toHaveBeenCalledWith({ user: mockUser._id });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockNotifications);
    });
    
    it('should handle errors when fetching notifications', async () => {
      // Mock Notification.find() to throw an error
      const Notification = require('../../../models/Notification');
      Notification.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Test error'))
      });
      
      // Call the controller method
      await notificationController.getNotifications(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error fetching notifications:'),
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: "Error fetching notifications" });
    });
  });
  
  // Tests for markNotificationAsRead endpoint
  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      // Mock Notification.findOneAndUpdate()
      const Notification = require('../../../models/Notification');
      Notification.findOneAndUpdate.mockResolvedValue(mockNotifications[0]);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockNotifications[0]._id.toString(), user: mockUser._id },
        { isRead: true },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        message: "Notification marked as read",
        notification: mockNotifications[0]
      });
    });
    
    it('should return 404 when notification is not found', async () => {
      // Mock Notification.findOneAndUpdate() to return null
      const Notification = require('../../../models/Notification');
      Notification.findOneAndUpdate.mockResolvedValue(null);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ error: "Notification not found" });
    });
    
    it('should handle errors when marking notification as read', async () => {
      // Mock Notification.findOneAndUpdate() to throw an error
      const Notification = require('../../../models/Notification');
      Notification.findOneAndUpdate.mockRejectedValue(new Error('Test error'));
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error marking notification as read:'),
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: "Error marking notification as read" });
    });
  });
  
  // Tests for deleteNotification endpoint
  describe('deleteNotification', () => {
    it('should delete a notification successfully', async () => {
      // Mock Notification.findOneAndDelete()
      const Notification = require('../../../models/Notification');
      Notification.findOneAndDelete.mockResolvedValue(mockNotifications[0]);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockNotifications[0]._id.toString(),
        user: mockUser._id
      });
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ message: "Notification deleted successfully" });
    });
    
    it('should still return success if notification does not exist', async () => {
      // Mock Notification.findOneAndDelete() to return null
      const Notification = require('../../../models/Notification');
      Notification.findOneAndDelete.mockResolvedValue(null);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ message: "Notification deleted successfully" });
    });
    
    it('should handle errors when deleting notification', async () => {
      // Mock Notification.findOneAndDelete() to throw an error
      const Notification = require('../../../models/Notification');
      Notification.findOneAndDelete.mockRejectedValue(new Error('Test error'));
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error deleting notification:'),
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ error: "Error deleting notification" });
    });
  });
  
  // Testing edge cases
  describe('Edge Cases', () => {
    // Test for invalid ID in markNotificationAsRead
    it('should handle invalid notification ID in markNotificationAsRead', async () => {
      // Setup invalid ID
      req.params.id = 'invalid-id';
      
      // Mock Notification.findOneAndUpdate() to throw a CastError
      const Notification = require('../../../models/Notification');
      const castError = new Error('Cast to ObjectId failed');
      castError.name = 'CastError';
      Notification.findOneAndUpdate.mockRejectedValue(castError);
      
      // Call the controller method
      await notificationController.markNotificationAsRead(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    });
    
    // Test for invalid ID in deleteNotification
    it('should handle invalid notification ID in deleteNotification', async () => {
      // Setup invalid ID
      req.params.id = 'invalid-id';
      
      // Mock Notification.findOneAndDelete() to throw a CastError
      const Notification = require('../../../models/Notification');
      const castError = new Error('Cast to ObjectId failed');
      castError.name = 'CastError';
      Notification.findOneAndDelete.mockRejectedValue(castError);
      
      // Call the controller method
      await notificationController.deleteNotification(req, res);
      
      // Assertions
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(httpStatus.SERVER_ERROR);
    });
    
    // Test when user has no notifications
    it('should return empty array when user has no notifications', async () => {
      // Mock Notification.find().sort() to return empty array
      const Notification = require('../../../models/Notification');
      const sortMock = jest.fn().mockResolvedValue([]);
      Notification.find.mockReturnValue({
        sort: sortMock
      });
      
      // Call the controller method
      await notificationController.getNotifications(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});