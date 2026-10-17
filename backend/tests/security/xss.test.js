// test/security/xss.test.js
const request = require('supertest');
const app = require('../../server');

describe('XSS Test', () => {
  it('should not allow XSS in user input fields', async () => {
    const payload = {
      comment: '<script>alert("XSS")</script>',
    };
    const res = await request(app)
      .post('/api/comments')
      .send(payload);
    expect(res.body).not.toContain('<script>'); // Ensure script tag is sanitized
  });
});