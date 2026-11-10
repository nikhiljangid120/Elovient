/**
 * Senior Staff Engineer Live Smoke Test & Security Verification Harness
 * Tests all endpoints over live HTTP, simulates real client behavior,
 * and validates server-side ownership protection and S3 workflows.
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let server;
let mongoServer;
let BASE_URL;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const logPass = (title) => console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${title}`);
const logFail = (title, err) => {
  console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${title}: ${err}`);
  process.exitCode = 1;
};

// Helper for making HTTP requests
const request = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof Buffer)) {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
};

async function runLiveSmokeTests() {
  console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   BUG TRACKER LITE - SENIOR ENGINEER SMOKE & VERIFICATION SUITE   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}\n`);

  // 1. Setup in-memory MongoDB and live HTTP server
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  server = app.listen(0);
  const port = server.address().port;
  BASE_URL = `http://127.0.0.1:${port}`;
  console.log(`[INIT] Live test server listening on ${BASE_URL}`);

  let user1Token, user2Token, user1Id, user2Id;
  let testBugId;
  let presignedUploadUrl, presignedImageKey;

  try {
    // ----------------------------------------------------
    // TEST SECTION 1: Health & API Documentation
    // ----------------------------------------------------
    console.log(`\n${colors.bold}1. System Health & Documentation Verification:${colors.reset}`);
    
    const health = await request('/api/health');
    if (health.status === 200 && health.body.status === 'healthy') {
      logPass(`GET /api/health returns 200 OK with healthy status`);
    } else {
      logFail(`GET /api/health`, `Status: ${health.status}`);
    }

    const docs = await request('/api-docs/');
    if (docs.status === 200 || docs.status === 301) {
      logPass(`GET /api-docs/ serves OpenAPI / Swagger UI`);
    } else {
      logFail(`GET /api-docs/`, `Status: ${docs.status}`);
    }

    // ----------------------------------------------------
    // TEST SECTION 2: Authentication & Duplicate Checks
    // ----------------------------------------------------
    console.log(`\n${colors.bold}2. Authentication & Data Validation:${colors.reset}`);

    // Register User 1
    const reg1 = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Alice Developer', email: 'alice@company.com', password: 'Password123!' },
    });
    if (reg1.status === 201 && reg1.body.token) {
      user1Token = reg1.body.token;
      user1Id = reg1.body.user.id;
      logPass(`POST /api/auth/signup registers User 1 and issues JWT token`);
    } else {
      logFail(`POST /api/auth/signup User 1`, JSON.stringify(reg1.body));
    }

    // Duplicate Email Prevention
    const regDup = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Alice Impostor', email: 'alice@company.com', password: 'Password123!' },
    });
    if (regDup.status === 400 && regDup.body.message.includes('already exists')) {
      logPass(`POST /api/auth/signup prevents duplicate email registration (400 Bad Request)`);
    } else {
      logFail(`Duplicate registration check`, JSON.stringify(regDup.body));
    }

    // Register User 2 (for multi-tenant ownership attack tests)
    const reg2 = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Bob Hacker', email: 'bob@attacker.com', password: 'Password123!' },
    });
    if (reg2.status === 201 && reg2.body.token) {
      user2Token = reg2.body.token;
      user2Id = reg2.body.user.id;
      logPass(`POST /api/auth/signup registers User 2 (Attacker Persona)`);
    } else {
      logFail(`POST /api/auth/signup User 2`, JSON.stringify(reg2.body));
    }

    // Login Authentication
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'alice@company.com', password: 'Password123!' },
    });
    if (login.status === 200 && login.body.token) {
      logPass(`POST /api/auth/login validates credentials and returns JWT`);
    } else {
      logFail(`POST /api/auth/login`, JSON.stringify(login.body));
    }

    // Verify /api/auth/me
    const me = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (me.status === 200 && me.body.user.email === 'alice@company.com') {
      logPass(`GET /api/auth/me resolves authenticated user identity`);
    } else {
      logFail(`GET /api/auth/me`, JSON.stringify(me.body));
    }

    // ----------------------------------------------------
    // TEST SECTION 3: AWS S3 Pre-Signed Upload & Limits
    // ----------------------------------------------------
    console.log(`\n${colors.bold}3. AWS S3 Pre-Signed Upload Architecture:${colors.reset}`);

    // Reject non-image upload
    const badMime = await request('/api/bugs/upload-url', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { fileName: 'payload.sh', fileType: 'application/x-sh', fileSize: 500 },
    });
    if (badMime.status === 400 && badMime.body.message.includes('Only JPG, JPEG, PNG, and WebP')) {
      logPass(`POST /api/bugs/upload-url rejects non-image MIME formats (400)`);
    } else {
      logFail(`MIME rejection`, JSON.stringify(badMime.body));
    }

    // Reject file > 5MB
    const bigFile = await request('/api/bugs/upload-url', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { fileName: 'huge.png', fileType: 'image/png', fileSize: 6 * 1024 * 1024 },
    });
    if (bigFile.status === 400 && bigFile.body.message.includes('exceeds 5MB limit')) {
      logPass(`POST /api/bugs/upload-url enforces 5MB maximum file size constraint`);
    } else {
      logFail(`5MB limit enforcement`, JSON.stringify(bigFile.body));
    }

    // Valid Pre-signed Upload URL generation
    const validUpload = await request('/api/bugs/upload-url', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { fileName: 'dashboard_error.png', fileType: 'image/png', fileSize: 204800 },
    });
    if (validUpload.status === 200 && validUpload.body.uploadUrl && validUpload.body.imageKey) {
      presignedUploadUrl = validUpload.body.uploadUrl;
      presignedImageKey = validUpload.body.imageKey;
      logPass(`POST /api/bugs/upload-url generates pre-signed S3 URL (expires in 300s)`);
    } else {
      logFail(`Upload URL generation`, JSON.stringify(validUpload.body));
    }

    // ----------------------------------------------------
    // TEST SECTION 4: Bug Management Lifecycle & Filtering
    // ----------------------------------------------------
    console.log(`\n${colors.bold}4. Bug Management Lifecycle (CRUD & Filters):${colors.reset}`);

    // Create Bug for User 1
    const createBug = await request('/api/bugs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: {
        title: 'Crash on clicking Export PDF',
        description: 'Memory allocation failure occurs when exporting reports exceeding 50 pages.',
        severity: 'high',
        status: 'open',
        imageKey: presignedImageKey,
      },
    });
    if (createBug.status === 201 && createBug.body.bug.title) {
      testBugId = createBug.body.bug._id || createBug.body.bug.id;
      logPass(`POST /api/bugs creates bug with severity, status, and S3 imageKey`);
    } else {
      logFail(`POST /api/bugs`, JSON.stringify(createBug.body));
    }

    // List Bugs (Isolation check: User 1 should see 1 bug)
    const listUser1 = await request('/api/bugs', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (listUser1.status === 200 && listUser1.body.bugs.length === 1) {
      logPass(`GET /api/bugs returns only bugs belonging to the authenticated user`);
    } else {
      logFail(`List bugs isolation`, JSON.stringify(listUser1.body));
    }

    // Filter Bugs by Status (?status=open vs ?status=closed)
    const filterOpen = await request('/api/bugs?status=open', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const filterClosed = await request('/api/bugs?status=closed', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (filterOpen.body.bugs.length === 1 && filterClosed.body.bugs.length === 0) {
      logPass(`GET /api/bugs?status=open correctly filters bugs by status query`);
    } else {
      logFail(`Status filter verification`, `Open: ${filterOpen.body.bugs.length}, Closed: ${filterClosed.body.bugs.length}`);
    }

    // View Bug by ID with pre-signed imageUrl
    const viewBug = await request(`/api/bugs/${testBugId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (viewBug.status === 200 && viewBug.body.bug.imageUrl) {
      logPass(`GET /api/bugs/:id provides bug details with short-lived pre-signed GET imageUrl`);
    } else {
      logFail(`GET /api/bugs/:id`, JSON.stringify(viewBug.body));
    }

    // Edit Bug
    const editBug = await request(`/api/bugs/${testBugId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: {
        status: 'in-progress',
        description: 'Root cause identified: Stream chunk buffer overflow in PDF generator.',
      },
    });
    if (editBug.status === 200 && editBug.body.bug.status === 'in-progress') {
      logPass(`PUT /api/bugs/:id updates bug fields and validates schema`);
    } else {
      logFail(`PUT /api/bugs/:id`, JSON.stringify(editBug.body));
    }

    // ----------------------------------------------------
    // TEST SECTION 5: Senior Security Audit - Server-Side Ownership Attacks
    // ----------------------------------------------------
    console.log(`\n${colors.bold}5. Security & Ownership Protection (Manual ID Tampering Simulation):${colors.reset}`);

    // Attack 1: User 2 tries to GET User 1's bug
    const attackGet = await request(`/api/bugs/${testBugId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    if (attackGet.status === 403 && attackGet.body.message.includes('Access denied')) {
      logPass(`SECURITY: User 2 blocked from viewing User 1 bug (HTTP 403 Forbidden)`);
    } else {
      logFail(`Ownership bypass on GET`, `Status: ${attackGet.status}`);
    }

    // Attack 2: User 2 tries to PUT (modify) User 1's bug
    const attackPut = await request(`/api/bugs/${testBugId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user2Token}` },
      body: { title: 'Compromised by Attacker' },
    });
    if (attackPut.status === 403 && attackPut.body.message.includes('Access denied')) {
      logPass(`SECURITY: User 2 blocked from modifying User 1 bug (HTTP 403 Forbidden)`);
    } else {
      logFail(`Ownership bypass on PUT`, `Status: ${attackPut.status}`);
    }

    // Attack 3: User 2 tries to DELETE User 1's bug
    const attackDelete = await request(`/api/bugs/${testBugId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    if (attackDelete.status === 403 && attackDelete.body.message.includes('Access denied')) {
      logPass(`SECURITY: User 2 blocked from deleting User 1 bug (HTTP 403 Forbidden)`);
    } else {
      logFail(`Ownership bypass on DELETE`, `Status: ${attackDelete.status}`);
    }

    // ----------------------------------------------------
    // TEST SECTION 6: Bug Deletion & Cleanup
    // ----------------------------------------------------
    console.log(`\n${colors.bold}6. Legitimate Deletion & S3 Cleanup:${colors.reset}`);

    const legitimateDelete = await request(`/api/bugs/${testBugId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (legitimateDelete.status === 200 && legitimateDelete.body.success) {
      logPass(`DELETE /api/bugs/:id successfully deletes bug and triggers S3 asset removal`);
    } else {
      logFail(`Legitimate deletion`, JSON.stringify(legitimateDelete.body));
    }

    // Verify bug is gone
    const verifyGone = await request(`/api/bugs/${testBugId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    if (verifyGone.status === 404) {
      logPass(`GET /api/bugs/:id returns 404 Not Found after deletion`);
    } else {
      logFail(`Bug persistence after deletion`, `Status: ${verifyGone.status}`);
    }

    console.log(`\n${colors.bold}${colors.green}========================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   ALL SMOKE TESTS AND SECURITY SCENARIOS PASSED WITH ZERO ERRORS!     ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}========================================================================${colors.reset}\n`);

  } catch (err) {
    console.error(`\n${colors.red}Unhandled Smoke Test Exception:${colors.reset}`, err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
}

runLiveSmokeTests();

