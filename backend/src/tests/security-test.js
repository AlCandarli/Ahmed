/**
 * Security Testing Suite - مجموعة اختبارات الأمان
 */

const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  
  describe('Authentication Security', () => {
    test('Should prevent brute force attacks', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';
      
      // محاولة تسجيل دخول متكررة بكلمة مرور خاطئة
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: wrongPassword });
      }
      
      // يجب أن يتم حظر المحاولة السابعة
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: wrongPassword });
      
      expect(response.status).toBe(429);
    });

    test('Should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123', // كلمة مرور ضعيفة
          confirmPassword: '123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('Should require valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(response.status).toBe(401);
    });
  });

  describe('File Upload Security', () => {
    test('Should reject dangerous file types', async () => {
      const response = await request(app)
        .post('/api/files/extract-text')
        .attach('file', Buffer.from('malicious content'), 'malware.exe');
      
      expect(response.status).toBe(400);
    });

    test('Should reject oversized files', async () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      
      const response = await request(app)
        .post('/api/files/extract-text')
        .attach('file', largeBuffer, 'large.pdf');
      
      expect(response.status).toBe(413);
    });

    test('Should scan file content for malicious patterns', async () => {
      const maliciousContent = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/files/extract-text')
        .attach('file', Buffer.from(maliciousContent), 'test.txt');
      
      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation Security', () => {
    test('Should prevent SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ search: "'; DROP TABLE users; --" });
      
      expect(response.status).toBe(400);
    });

    test('Should prevent NoSQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null }
        });
      
      expect(response.status).toBe(400);
    });

    test('Should sanitize XSS attempts', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting Security', () => {
    test('Should enforce general rate limits', async () => {
      const promises = [];
      
      // إرسال 101 طلب (أكثر من الحد المسموح)
      for (let i = 0; i < 101; i++) {
        promises.push(
          request(app).get('/api/health')
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Should enforce stricter limits on auth endpoints', async () => {
      const promises = [];
      
      // إرسال 6 طلبات تسجيل دخول
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection', () => {
    test('Should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});
      
      // يجب أن يفشل بدون CSRF token
      expect(response.status).toBe(403);
    });

    test('Should accept valid CSRF token', async () => {
      // الحصول على CSRF token أولاً
      const tokenResponse = await request(app)
        .get('/api/csrf-token');
      
      const csrfToken = tokenResponse.body.csrfToken;
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('X-CSRF-Token', csrfToken)
        .send({});
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('Security Headers', () => {
    test('Should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    test('Should include CSP headers', async () => {
      const response = await request(app)
        .get('/api/health');
      
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Data Sanitization', () => {
    test('Should sanitize dangerous MongoDB operators', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ 
          filter: JSON.stringify({ $where: 'function() { return true; }' })
        });
      
      expect(response.status).toBe(400);
    });

    test('Should limit query complexity', async () => {
      const complexQuery = {};
      
      // إنشاء استعلام معقد جداً
      for (let i = 0; i < 25; i++) {
        complexQuery[`field${i}`] = { $in: Array(100).fill(i) };
      }
      
      const response = await request(app)
        .get('/api/users')
        .query({ filter: JSON.stringify(complexQuery) });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Session Security', () => {
    test('Should invalidate tokens after password change', async () => {
      // تسجيل دخول والحصول على token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'currentPassword'
        });
      
      const token = loginResponse.body.data.token;
      
      // تغيير كلمة المرور
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'currentPassword',
          newPassword: 'NewPassword123!'
        });
      
      // محاولة استخدام الـ token القديم
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
    });

    test('Should detect suspicious login patterns', async () => {
      // محاولة تسجيل دخول من مواقع مختلفة بسرعة
      const responses = await Promise.all([
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '192.168.1.1')
          .send({ email: 'test@example.com', password: 'password' }),
        
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '10.0.0.1')
          .send({ email: 'test@example.com', password: 'password' })
      ]);
      
      // يجب أن يتم تسجيل هذا كنشاط مشبوه
      expect(responses.some(res => res.status === 429)).toBe(true);
    });
  });

  describe('Error Handling Security', () => {
    test('Should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body.stack).toBeUndefined();
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('token');
    });

    test('Should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });
  });
});

module.exports = {
  // يمكن تصدير دوال مساعدة للاختبار
};
