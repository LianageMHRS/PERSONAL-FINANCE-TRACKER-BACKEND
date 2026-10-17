const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const User = require('../../../models/User');
const httpStatus = require('../../../constants/httpStatus');
const adminController = require('../../../controllers/adminController');
const { protect, admin } = require('../../../middleware/authMiddleware');

// Mock middlewares
jest.mock('../../../middleware/authMiddleware', () => ({
  protect: jest.fn((req, res, next) => next()),
  admin: jest.fn((req, res, next) => next())
}));

// Setup express app for testing
const app = express();
app.use(express.json());

// Setup routes for testing
app.get('/api/admin/users', protect, admin, adminController.getAllUsers);
app.get('/api/admin/users/:id', protect, admin, adminController.getUserById);
app.put('/api/admin/users/:id', protect, admin, adminController.updateUser);
app.delete('/api/admin/users/:id', protect, admin, adminController.deleteUser);
app.get('/api/admin/profile', protect, admin, adminController.getAdminProfile);

describe('Admin Controller Integration Tests', () => {
  let mongoServer;
  let adminUser;
  let regularUser;

  // Setup - Connect to in-memory MongoDB before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clean up after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Setup test data before each test
  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create an admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: 'admin'
    });
    await adminUser.save();

    // Create a regular user
    regularUser = new User({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'User@123',
      role: 'user'
    });
    await regularUser.save();

    // Reset middleware mocks
    protect.mockClear();
    admin.mockClear();
  });

  describe('getAllUsers', () => {
    // Positive test case: Successfully retrieve all users
    test('should get all regular users successfully', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(httpStatus.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1); // Only one regular user
      expect(response.body[0].email).toBe(regularUser.email);
      expect(response.body[0].role).toBe('user');
      expect(response.body[0].password).toBeUndefined(); // Password should be excluded
    });

    // Negative test case: Database error
    test('should handle database errors gracefully', async () => {
      // Mock User.find to throw an error
      const originalFind = User.find;
      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error fetching users');

      // Restore original implementation
      User.find = originalFind;
    });
  });

  describe('getUserById', () => {
    // Positive test case: Successfully retrieve user by ID
    test('should get user by ID successfully', async () => {
      const response = await request(app).get(`/api/admin/users/${regularUser._id}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body._id.toString()).toBe(regularUser._id.toString());
      expect(response.body.name).toBe(regularUser.name);
      expect(response.body.email).toBe(regularUser.email);
      expect(response.body.password).toBeUndefined(); // Password should be excluded
    });

    // Negative test case: User not found
    test('should return 404 when user is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/admin/users/${nonExistentId}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('User not found');
    });

    // Negative test case: Invalid ID format
    test('should handle invalid ID format', async () => {
      const response = await request(app).get('/api/admin/users/invalidid');

      expect(response.status).toBe(httpStatus.SERVER_ERROR);
      expect(response.body.error).toBe('Error fetching user');
    });
  });

  describe('updateUser', () => {
    // Positive test case: Successfully update user
    test('should update user successfully', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .send(updateData);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.message).toBe('User updated successfully');

      // Verify user was updated in the database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(updateData.email);
      expect(updatedUser.role).toBe(updateData.role);
    });

    // Negative test case: Cannot update an admin
    test('should not allow updating other admins', async () => {
      const updateData = {
        name: 'Try Update Admin',
        role: 'user'
      };

      const response = await request(app)
        .put(`/api/admin/users/${adminUser._id}`)
        .send(updateData);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
      expect(response.body.error).toBe('Cannot update other admins');

      // Verify admin user was not updated
      const unchangedAdmin = await User.findById(adminUser._id);
      expect(unchangedAdmin.name).toBe(adminUser.name);
      expect(unchangedAdmin.role).toBe('admin');
    });

    // Negative test case: User not found
    test('should return 404 when trying to update non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { name: 'New Name' };

      const response = await request(app)
        .put(`/api/admin/users/${nonExistentId}`)
        .send(updateData);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('User not found');
    });

    // Negative test case: Invalid email format
    test('should validate email format on update', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .send(updateData);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid email format');
    });

    // Negative test case: Invalid role assignment
    test('should validate role assignment on update', async () => {
      const updateData = {
        role: 'superadmin' // Invalid role
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}`)
        .send(updateData);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid role assignment');
    });
  });

  describe('deleteUser', () => {
    // Positive test case: Successfully delete user
    test('should delete user successfully', async () => {
      const response = await request(app).delete(`/api/admin/users/${regularUser._id}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user was deleted from database
      const deletedUser = await User.findById(regularUser._id);
      expect(deletedUser).toBeNull();
    });

    // Negative test case: Cannot delete an admin
    test('should not allow deleting other admins', async () => {
      const response = await request(app).delete(`/api/admin/users/${adminUser._id}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
      expect(response.body.error).toBe('Cannot delete other admins');

      // Verify admin was not deleted
      const adminStillExists = await User.findById(adminUser._id);
      expect(adminStillExists).toBeTruthy();
    });

    // Negative test case: User not found
    test('should return 404 when trying to delete non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).delete(`/api/admin/users/${nonExistentId}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('getAdminProfile', () => {
    // Positive test case: Successfully retrieve admin profile
    test('should get admin profile successfully', async () => {
      // Mock req.user for this test
      protect.mockImplementation((req, res, next) => {
        req.user = adminUser;
        next();
      });

      const response = await request(app).get('/api/admin/profile');

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.admin._id.toString()).toBe(adminUser._id.toString());
      expect(response.body.admin.name).toBe(adminUser.name);
      expect(response.body.admin.email).toBe(adminUser.email);
      expect(response.body.admin.role).toBe('admin');
      expect(response.body.admin.password).toBeUndefined(); // Password should be excluded
      expect(response.body.message).toBe('Admin profile retrieved successfully');
    });

    // Negative test case: User is not an admin
    test('should return 403 when user is not an admin', async () => {
      // Mock req.user with a non-admin user
      protect.mockImplementation((req, res, next) => {
        req.user = regularUser;
        next();
      });

      // Mock admin middleware to actually check role
      admin.mockImplementation((req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
          return res.status(httpStatus.FORBIDDEN).json({ error: "Access denied. Admins only." });
        }
        next();
      });

      const response = await request(app).get('/api/admin/profile');

      expect(response.status).toBe(httpStatus.FORBIDDEN);
      expect(response.body.error).toBe('Access denied. Admins only.');
    });

    // Negative test case: Admin not found in database
    test('should return 404 when admin is not found in database', async () => {
      // Create a user object that's not in the database
      const nonExistentAdmin = {
        _id: new mongoose.Types.ObjectId(),
        role: 'admin'
      };

      // Mock req.user with admin that doesn't exist in database
      protect.mockImplementation((req, res, next) => {
        req.user = nonExistentAdmin;
        next();
      });

      const response = await request(app).get('/api/admin/profile');

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      expect(response.body.error).toBe('Admin not found. Please log in again.');
    });

    // Negative test case: No user in request
    test('should return 403 when no user in request', async () => {
      // Mock req.user to be undefined
      protect.mockImplementation((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app).get('/api/admin/profile');

      expect(response.status).toBe(httpStatus.FORBIDDEN);
      expect(response.body.error).toBe('Access denied. Admins only.');
    });
  });
});