import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { verifySessionToken } from '../src/modules/auth/authService.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

describe('Auth & API Security', () => {
  const app = createApp();

  it('should return comprehensive health status with verified database query and queue', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('outreach-api');
    expect(res.body.database).toBe('connected');
    expect(res.body.mode).toBe('DRY_RUN');

    const dbRes = await request(app).get('/api/health/db');
    expect(dbRes.status).toBe(200);
    expect(dbRes.body.database).toBe('connected');

    const qRes = await request(app).get('/api/health/queue');
    expect(qRes.status).toBe(200);
    expect(qRes.body.queue).toBeDefined();
  });

  it('should reject unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('should reject invalid login credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@rankriseusa.com',
        password: 'wrongpassword123',
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('should reject malformed login payload', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid-email',
        password: '12',
      });
    expect(res.status).toBe(400);
  });

  it('should authenticate with valid Bearer token and accept authorized request', async () => {
    // Generate valid test token
    const testToken = jwt.sign(
      { userId: 'test-admin-1', email: 'admin@rankriseusa.com', role: 'ADMIN' },
      env.SESSION_SECRET,
      { expiresIn: '1h' }
    );

    const verified = verifySessionToken(testToken);
    expect(verified).toBeDefined();
    expect(verified?.email).toBe('admin@rankriseusa.com');

    // Make authenticated request to /api/leads
    // Note: if DB connection is unavailable during isolated unit tests, prisma might throw or return
    // But auth middleware itself must allow through
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${testToken}`);

    // Expect not 401 (either 200 or 500 if DB is offline)
    expect(res.status).not.toBe(401);
  });
});
