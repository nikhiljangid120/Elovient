const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

  describe('2. AWS S3 Pre-signed Upload URL Endpoint', () => {
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

    it('should generate pre-signed upload URL for valid image', async () => {
      const res = await request(app)
        .post('/api/bugs/upload-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'login_error.png',
          fileType: 'image/png',
          fileSize: 1024 * 500, // 500 KB
        });

      expect(res.status).toBe(200);
      expect(res.body.uploadUrl).toBeDefined();
      expect(res.body.imageKey).toContain('login_error.png');
      expect(res.body.expiresInSeconds).toBe(300);
    });
  });

  describe('3. Bug Management & CRUD Operations', () => {
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

    it('should list only bugs belonging to the authenticated user', async () => {
      // First create a bug for User 2
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
      const res = await request(app)
        .get('/api/bugs?status=closed')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.bugs.length).toBe(0);
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
  });

  describe('4. Mandatory Server-Side Ownership Protection', () => {
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

  describe('5. Bug Deletion & Cleanup', () => {
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
});
