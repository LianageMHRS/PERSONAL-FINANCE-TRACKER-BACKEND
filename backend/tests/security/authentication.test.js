// test/security/authentication.test.js
const request = require('supertest');
const app = require('../../server');

describe('Authentication Test', () => {
  it('should not allow access without a valid token', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'InvalidToken');
    expect(res.status).toBe(401); // Expect unauthorized access
  });
});