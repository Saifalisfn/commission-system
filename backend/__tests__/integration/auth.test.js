/**
 * Auth route integration tests.
 *
 * These tests exercise the full Express route → validation → controller chain.
 * The User model is mocked so no real database is required. For schema-level
 * validation and unique-constraint tests, run against a live/in-memory MongoDB.
 */
import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';

process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// ─── Mock User model ─────────────────────────────────────────────────────────

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindById = jest.fn();

jest.unstable_mockModule('../../models/User.model.js', () => ({
  default: {
    findOne: mockFindOne,
    create: mockCreate,
    findById: mockFindById
  }
}));

// ─── Build test app (dynamic imports after mock registration) ─────────────────

let app;

beforeAll(async () => {
  const { default: authRoutes } = await import('../../routes/auth.routes.js');
  const { errorHandler } = await import('../../middleware/error.middleware.js');

  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeUserDoc(overrides = {}) {
  const passwordHash = await bcrypt.hash('secret123', 10);
  return {
    _id: 'user-id-1',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
    passwordHash,
    comparePassword: async (pw) => bcrypt.compare(pw, passwordHash),
    ...overrides
  };
}

// ─── POST /register ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  const payload = { name: 'Alice', email: 'alice@example.com', password: 'secret123' };

  test('returns 201 with tokens on success', async () => {
    mockFindOne.mockResolvedValue(null); // no duplicate
    mockCreate.mockResolvedValue({ _id: 'user-id-1', name: 'Alice', email: 'alice@example.com', role: 'user' });

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test('returned user object does not contain passwordHash', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ _id: 'user-id-1', name: 'Alice', email: 'alice@example.com', role: 'user' });

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  test('defaults role to "user"', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ _id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'user' });

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.body.data.user.role).toBe('user');
  });

  test('returns 400 when email already exists', async () => {
    mockFindOne.mockResolvedValue({ email: 'alice@example.com' }); // duplicate found

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 for invalid email format (validation layer)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled(); // should reject before hitting the controller
  });

  test('returns 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, password: '123' });
    expect(res.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  test('returns 400 when name is shorter than 2 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, name: 'A' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for an invalid role value', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, role: 'superuser' });
    expect(res.status).toBe(400);
  });

  test('issued access token contains the userId', async () => {
    const created = { _id: 'user-id-42', name: 'Alice', email: 'alice@example.com', role: 'user' };
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue(created);

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    const decoded = jwt.verify(res.body.data.accessToken, ACCESS_SECRET);
    expect(decoded.userId).toBe('user-id-42');
  });
});

// ─── POST /login ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  test('returns 200 with tokens for valid credentials', async () => {
    const user = await makeUserDoc();
    mockFindOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test('returned user object does not contain passwordHash', async () => {
    const user = await makeUserDoc();
    mockFindOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });

    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  test('returns 401 for wrong password', async () => {
    const user = await makeUserDoc();
    mockFindOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 for non-existent email', async () => {
    mockFindOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass' });

    expect(res.status).toBe(401);
  });

  test('returns 400 for missing email (validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'secret123' });
    expect(res.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  test('returns 400 for missing password (validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  function makeRefreshToken(userId = 'user-id-1') {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  }

  test('returns a new access token for a valid refresh token', async () => {
    const user = { _id: 'user-id-1', name: 'Alice', email: 'alice@example.com', role: 'user' };
    mockFindById.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: makeRefreshToken() });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(() => jwt.verify(res.body.data.accessToken, ACCESS_SECRET)).not.toThrow();
  });

  test('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  test('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'this.is.invalid' });
    expect(res.status).toBe(401);
  });

  test('returns 401 for an expired refresh token', async () => {
    const expired = jwt.sign({ userId: 'u1' }, REFRESH_SECRET, { expiresIn: '-1s' });
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: expired });
    expect(res.status).toBe(401);
  });

  test('returns 401 when user in token no longer exists', async () => {
    mockFindById.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: makeRefreshToken() });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/User not found/i);
  });
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  function makeAccessToken(userId = 'user-id-1') {
    return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
  }

  test('returns the authenticated user profile', async () => {
    const userDoc = { _id: 'user-id-1', name: 'Alice', email: 'alice@example.com', role: 'user' };
    // authenticate calls User.findById().select('-passwordHash')
    mockFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(userDoc) });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  test('does not return passwordHash', async () => {
    const userDoc = { _id: 'user-id-1', name: 'Alice', email: 'alice@example.com', role: 'user' };
    mockFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(userDoc) });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
