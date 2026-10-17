// test/security/sql-injection.test.js
const request = require('supertest');
const app = require('../../server'); // Import your Express app

describe('SQL Injection Test', () => {
  it('should not allow SQL injection in login endpoint', async () => {
    const payload = {
      email: "' OR '1'='1",
      password: "' OR '1'='1",
    };
    const res = await request(app)
      .post('/api/login')
      .send(payload);
    expect(res.status).not.toBe(200); // Expect a failure response
  });
});