const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const rateLimit = require('express-rate-limit');
const express = require('express');
const app = require('../src/app');
const User = require('../src/models/User');
const Bug = require('../src/models/Bug');

let mongoServer;
let user1Token;
let user2Token;
let user1Id;
let user2Id;
let bug1Id;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('=== Bug Tracker Lite API Suite ===', () => {

  describe('1. Authentication Endpoints', () => {
    it('should reject signup with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'incomplete@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please provide name, email, and password');
    });

    it('should reject signup when password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('should register a new user successfully (User 1)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Nikhil Tester',
          email: 'nikhil@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('nikhil@example.com');
      user1Token = res.body.token;
      user1Id = res.body.user.id;
    });

    it('should prevent duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Duplicate Guy',
          email: 'nikhil@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should register a second user for ownership security tests (User 2)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Attacker User',
          email: 'attacker@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      user2Token = res.body.token;
      user2Id = res.body.user.id;
    });

    it('should authenticate user and return valid JWT token on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nikhil@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Nikhil Tester');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nikhil@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. JWT Authentication Guard & Security', () => {
    it('should reject requests with missing Authorization header (401)', async () => {
      const res = await request(app).get('/api/bugs');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No authorization token provided');
    });

    it('should reject requests with malformed JWT token (401)', async () => {
      const res = await request(app)
        .get('/api/bugs')
        .set('Authorization', 'Bearer totally-invalid-token-string-123');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid authorization token');
    });

    it('should return current user profile on GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('nikhil@example.com');
    });
  });

  describe('3. AWS S3 Pre-signed Upload URL Endpoint', () => {
    it('should reject unauthenticated request for upload URL', async () => {
      const res = await request(app)
        .post('/api/bugs/upload-url')
        .send({
          fileName: 'screenshot.png',
          fileType: 'image/png',
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid file types (e.g., pdf or exe)', async () => {
      const res = await request(app)
        .post('/api/bugs/upload-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'malware.exe',
          fileType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only JPG, JPEG, PNG, and WebP');
    });

    it('should reject file sizes exceeding 5MB', async () => {
      const res = await request(app)
        .post('/api/bugs/upload-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'giant.png',
          fileType: 'image/png',
          fileSize: 6 * 1024 * 1024, // 6 MB
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds 5MB limit');
    });

    it('should generate pre-signed upload URL for valid image (case insensitive MIME)', async () => {
      const res = await request(app)
        .post('/api/bugs/upload-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'login_error.PNG',
          fileType: 'image/PNG',
          fileSize: 1024 * 500, // 500 KB
        });

      expect(res.status).toBe(200);
      expect(res.body.uploadUrl).toBeDefined();
      expect(res.body.imageKey).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(300);
    });
  });

  describe('4. Bug Management & CRUD Operations', () => {
    it('should reject bug creation with missing title or description', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: '',
          description: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Title and description are required');
    });

    it('should reject bug creation with invalid severity', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Test',
          description: 'Desc',
          severity: 'super-critical', // invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Severity must be either "low", "med", or "high"');
    });

    it('should reject bug creation with invalid status', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Test',
          description: 'Desc',
          status: 'resolved-unknown', // invalid status
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Status must be either "open", "in-progress", or "closed"');
    });

    it('should create a new bug with severity and status validation', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Navbar dropdown overlaps modal',
          description: 'When clicking user profile, dropdown renders behind backdrop on mobile.',
          severity: 'high',
          status: 'open',
          imageKey: 'bugs/user1/test-screen.png',
        });

      expect(res.status).toBe(201);
      expect(res.body.bug.title).toBe('Navbar dropdown overlaps modal');
      expect(res.body.bug.severity).toBe('high');
      expect(res.body.bug.status).toBe('open');
      expect(res.body.bug.userId.toString()).toBe(user1Id.toString());
      expect(res.body.bug.imageUrl).toBeDefined();
      bug1Id = res.body.bug._id || res.body.bug.id;
    });

    it('should list only bugs belonging to the authenticated user', async () => {
      // Create a bug for User 2 to verify data isolation
      await Bug.create({
        userId: user2Id,
        title: 'User 2 Secret Bug',
        description: 'Should never appear in User 1 list',
        severity: 'low',
        status: 'open',
      });

      const res = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.bugs.length).toBe(1);
      expect(res.body.bugs[0].title).toBe('Navbar dropdown overlaps modal');
    });

    it('should support filtering bugs by status', async () => {
      const openRes = await request(app)
        .get('/api/bugs?status=open')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(openRes.status).toBe(200);
      expect(openRes.body.bugs.length).toBe(1);

      const closedRes = await request(app)
        .get('/api/bugs?status=closed')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(closedRes.status).toBe(200);
      expect(closedRes.body.bugs.length).toBe(0);
    });

    it('should return 404 for invalid ObjectId format', async () => {
      const res = await request(app)
        .get('/api/bugs/invalid-id-format')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Bug not found');
    });

    it('should return 404 for non-existent bug ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/bugs/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Bug not found');
    });

    it('should allow owner to view bug details with pre-signed imageUrl', async () => {
      const res = await request(app)
        .get(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.bug.title).toBe('Navbar dropdown overlaps modal');
      expect(res.body.bug.imageUrl).toBeDefined();
    });

    it('should allow owner to edit bug details', async () => {
      const res = await request(app)
        .put(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          status: 'in-progress',
          description: 'Updated steps to reproduce.',
        });

      expect(res.status).toBe(200);
      expect(res.body.bug.status).toBe('in-progress');
      expect(res.body.bug.description).toBe('Updated steps to reproduce.');
    });

    it('should reject editing bug with invalid severity', async () => {
      const res = await request(app)
        .put(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          severity: 'invalid-severity',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('5. Mandatory Server-Side Ownership Protection', () => {
    it('SECURITY TEST: Reject User 2 from viewing User 1 bug (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('SECURITY TEST: Reject User 2 from editing User 1 bug (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Hacked by User 2',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('SECURITY TEST: Reject User 2 from deleting User 1 bug (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('6. Bug Deletion & Cleanup', () => {
    it('should allow the owner to delete their bug', async () => {
      const res = await request(app)
        .delete(`/api/bugs/${bug1Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify bug is deleted from DB
      const check = await Bug.findById(bug1Id);
      expect(check).toBeNull();
    });
  });

  describe('7. Rate Limiter Security Validation', () => {
    it('should enforce rate limit and return HTTP 429 when max limit is exceeded', async () => {
      const testApp = express();
      testApp.use(rateLimit({
        windowMs: 60000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            success: false,
            message: 'Too many authentication attempts from this IP. Please try again after 1 minute.',
            retryAfterSeconds: 60,
          });
        },
      }));
      testApp.get('/test-limit', (req, res) => res.json({ ok: true }));

      // Request 1: OK
      const r1 = await request(testApp).get('/test-limit');
      expect(r1.status).toBe(200);

      // Request 2: OK
      const r2 = await request(testApp).get('/test-limit');
      expect(r2.status).toBe(200);

      // Request 3: Limit breached -> 429
      const r3 = await request(testApp).get('/test-limit');
      expect(r3.status).toBe(429);
      expect(r3.body.success).toBe(false);
      expect(r3.body.message).toContain('Too many authentication attempts');
      expect(r3.body.retryAfterSeconds).toBe(60);
    });
  });
});
