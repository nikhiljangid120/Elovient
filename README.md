# Bug Tracker Lite & Evaluation Deliverables
**Candidate:** Nikhil Jangid • **Role:** Full Stack Developer • **Company:** Elovient Software Solutions  

[![CI Pipeline](https://img.shields.io/badge/CI-Passing-emerald)](https://github.com/nikhiljangid120/Elovient)
[![Node](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Pre--signed_URLs-orange.svg)](https://aws.amazon.com/s3)
[![Tests](https://img.shields.io/badge/Tests-30%2F30_Passing-brightgreen.svg)](https://jestjs.io)

---

## 📑 Deliverables Index

* **Task 1 – Bug Tracker Lite (Full-Stack App):**
  * [`backend/`](./backend): Node.js + Express REST API with MongoDB, JWT, Rate Limiting, AWS S3 Pre-signed URLs, Swagger UI.
  * [`frontend/`](./frontend): React 18 + Vite + Tailwind CSS SPA with direct S3 upload, status filtering, and live previews.
  * [`NOTES.md`](./NOTES.md): Answers to the 5 evaluation questions (priorities, trade-offs, DB choice, AWS strategy, 10k scaling).
* **Task 2 – Meeting Notes & Technical Proposal:**
  * [`docs/TASK_2_TECHNICAL_PROPOSAL.md`](./docs/TASK_2_TECHNICAL_PROPOSAL.md): Automotive plant production monitoring platform (real-time OEE engine, edge gateways, TimescaleDB, WebSockets).
* **Task 3 – High-Level ERP Architecture Diagram:**
  * [`docs/TASK_3_ERP_ARCHITECTURE.md`](./docs/TASK_3_ERP_ARCHITECTURE.md): ERP architecture for a paint manufacturer replacing Excel & unifying Tally financials.
  * [`docs/TASK_3_ERP_ARCHITECTURE.html`](./docs/TASK_3_ERP_ARCHITECTURE.html): Interactive vector SVG diagram viewer.
* **Evaluator Resources:**
  * [`docs/Bug_Tracker_Lite.postman_collection.json`](./docs/Bug_Tracker_Lite.postman_collection.json) • [`docs/LOOM_RECORDING_SCRIPT.md`](./docs/LOOM_RECORDING_SCRIPT.md) • [`docs/AWS_DEPLOYMENT_GUIDE.md`](./docs/AWS_DEPLOYMENT_GUIDE.md)

---

## ⚡ Quick Start (Run Locally)

### 1. Start Backend API (Port 5000)
```bash
cd backend
npm install
npm run dev
```
* **API:** `http://localhost:5000` • **Swagger UI:** `http://localhost:5000/api-docs`
* *Zero-Config:* If local MongoDB is not running, the backend automatically boots an embedded in-memory MongoDB with persistent disk storage.

### 2. Start Frontend App (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
* **App URL:** `http://localhost:3000`

### 3. Run with Docker Compose (Single Command)
```bash
docker compose up --build
```

---

## 🧪 Automated Tests & Live Smoke Testing

```bash
cd backend
npm test          # Runs 30/30 Jest unit, integration & security ownership tests
npm run test:smoke  # Runs live HTTP network smoke tests against real endpoints
```

---

## 🛠️ Architecture Highlights

1. **AWS S3 Pre-Signed Upload Flow:**
   * Browser requests an ephemeral pre-signed `PUT` URL via `POST /api/bugs/upload-url` (validates MIME type and size $\le 5\text{MB}$).
   * Browser streams raw binary directly to S3. **Zero server base64/binary proxying.**
   * Bucket remains strictly private. Pre-signed `GET` URLs (15m expiry) are generated on-demand for viewing images.
   * Deleting a bug automatically deletes its associated S3 object via AWS SDK v3 `DeleteObjectCommand`.
2. **Server-Side Ownership Enforcement:**
   * Ownership verification (`bug.userId === req.user._id`) is enforced on all `GET /:id`, `PUT /:id`, and `DELETE /:id` routes. Tampering with IDs returns **HTTP 403 Forbidden**.
3. **Authentication & Rate Limiting:**
   * JWT tokens + Bcrypt (10 rounds). Auth routes are rate-limited to **5 attempts/min per IP** (HTTP 429).
4. **Bonus Features:**
   * Swagger/OpenAPI docs (`/api-docs`), Winston structured logging, compound database indexing (`{ userId: 1, status: 1 }`), GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`), and multi-stage Dockerfiles.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user (rate-limited) | Public |
| `POST` | `/api/auth/login` | Authenticate & return JWT (rate-limited) | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer JWT |
| `POST` | `/api/bugs/upload-url` | Generate pre-signed S3 upload PUT URL | Bearer JWT |
| `POST` | `/api/bugs` | Create bug with title, description, severity, imageKey | Bearer JWT |
| `GET` | `/api/bugs` | List user's bugs (supports `?status=open`) | Bearer JWT |
| `GET` | `/api/bugs/:id` | View bug details & pre-signed image GET URL | Owner Only |
| `PUT` | `/api/bugs/:id` | Update bug details or replace image | Owner Only |
| `DELETE` | `/api/bugs/:id` | Delete bug & delete S3 image | Owner Only |
