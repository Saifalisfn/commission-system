import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';

const ACCESS_SECRET = 'test-access-secret';
process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;

// Mocked user returned by User.findById().select()
const mockUserDoc = { _id: 'user-id-1', name: 'Test User', email: 'test@x.com', role: 'user' };
const mockAdminDoc = { _id: 'admin-id-1', name: 'Admin', email: 'admin@x.com', role: 'admin' };

const mockSelectFn = jest.fn();
const mockFindById = jest.fn(() => ({ select: mockSelectFn }));

jest.unstable_mockModule('../../models/User.model.js', () => ({
  default: { findById: mockFindById }
}));

// Dynamic imports after mock registration
let authenticate, authorize;
beforeAll(async () => {
  ({ authenticate, authorize } = await import('../../middleware/auth.middleware.js'));
});

afterEach(() => {
  jest.clearAllMocks();
});

function buildApp(role = null) {
  const app = express();
  app.use(express.json());

  app.get('/protected', authenticate, (req, res) => {
    res.json({ success: true, userId: String(req.user._id) });
  });

  if (role) {
    app.get('/role-test', authenticate, authorize(role), (req, res) => {
      res.json({ success: true });
    });
  }

  app.get('/multi-role', authenticate, authorize('user', 'admin'), (req, res) => {
    res.json({ success: true });
  });

  return app;
}

function makeToken(userId = 'user-id-1', secret = ACCESS_SECRET, opts = {}) {
  return jwt.sign({ userId }, secret, { expiresIn: '15m', ...opts });
}

describe('authenticate middleware', () => {
  test('allows a valid bearer token and attaches user to req', async () => {
    mockSelectFn.mockResolvedValue(mockUserDoc);
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-id-1');
  });

  test('returns 401 when Authorization header is missing', async () => {
    const app = buildApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when header does not start with Bearer', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Token ${makeToken()}`);
    expect(res.status).toBe(401);
  });

  test('returns 401 for a malformed token', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Invalid access token/i);
  });

  test('returns 401 for an expired token', async () => {
    const app = buildApp();
    const expired = makeToken('user-id-1', ACCESS_SECRET, { expiresIn: '-1s' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('returns 401 when user no longer exists in DB', async () => {
    mockSelectFn.mockResolvedValue(null); // user deleted
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/User not found/i);
  });
});

describe('authorize middleware', () => {
  test('allows a user with the required role', async () => {
    mockSelectFn.mockResolvedValue(mockUserDoc); // role: 'user'
    const app = buildApp('user');
    const res = await request(app)
      .get('/role-test')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });

  test('returns 403 when role is insufficient', async () => {
    mockSelectFn.mockResolvedValue(mockUserDoc); // role: 'user', not 'admin'
    const app = buildApp('admin');
    const res = await request(app)
      .get('/role-test')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Insufficient permissions/i);
  });

  test('allows any of multiple accepted roles', async () => {
    mockSelectFn.mockResolvedValue(mockUserDoc); // role: 'user'
    const app = buildApp();
    const res = await request(app)
      .get('/multi-role')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });

  test('allows admin through a multi-role check', async () => {
    mockSelectFn.mockResolvedValue(mockAdminDoc); // role: 'admin'
    const adminToken = makeToken('admin-id-1');
    const app = buildApp();
    const res = await request(app)
      .get('/multi-role')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
