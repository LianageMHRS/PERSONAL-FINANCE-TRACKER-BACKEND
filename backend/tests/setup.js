// This file contains setup code for Jest

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Optional: Configure Jest timeout
jest.setTimeout(30000);

// Mock any external services that shouldn't be called during tests
// For example, if you use external notification services or APIs

// Silence console logs during tests (optional)
// Uncomment if you want to suppress console output
// global.console = {
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
//   info: jest.fn(),
//   debug: jest.fn(),
// };