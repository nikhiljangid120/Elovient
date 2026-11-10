# Bug Tracker Lite & Evaluation Deliverables
**Candidate:** Nikhil  
**Company:** Elovient Software Solutions  
**Role:** Full Stack Developer Evaluation  

[![CI Pipeline](https://img.shields.io/badge/CI-Passing-emerald)](https://github.com)
[![Node](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Pre--signed_URLs-orange.svg)](https://aws.amazon.com/s3)
[![Tests](https://img.shields.io/badge/Tests-19%2F19_Passing-brightgreen.svg)](https://jestjs.io)

---

## 📑 Repository Structure & Evaluation Index

This repository contains the complete deliverables for all **three tasks** requested by the Elovient evaluation team:

* **Task 1 – Coding Assignment: Bug Tracker Lite (Full-Stack Application)**
  * [`backend/`](./backend): Node.js + Express REST API with MongoDB, JWT Auth, Rate Limiting, AWS S3 Pre-signed URL generation, and Swagger UI.
  * [`frontend/`](./frontend): React 18 + Vite + Tailwind CSS issue dashboard with direct S3 upload, status filtering, and live previews.
  * [`docker-compose.yml`](./docker-compose.yml): One-command deployment for MongoDB, Backend API, and Nginx-hosted Frontend.
  * [`NOTES.md`](./NOTES.md): Detailed engineering answers to the 5 evaluation questions (priorities, trade-offs, DB choice, AWS approach, 10,000-user scaling plan).
* **Task 2 – Meeting Notes Simulation & Technical Proposal**
  * [`docs/TASK_2_TECHNICAL_PROPOSAL.md`](./docs/TASK_2_TECHNICAL_PROPOSAL.md): 1–2 page comprehensive discovery meeting notes and technical proposal for an automotive plant production monitoring platform (OEE engine, edge gateway, time-series telemetry).
* **Task 3 – High-Level ERP Architecture Diagram**
  * [`docs/TASK_3_ERP_ARCHITECTURE.md`](./docs/TASK_3_ERP_ARCHITECTURE.md): End-to-end ERP architecture for a paint manufacturer replacing Excel and unifying Tally financials.
  * [`docs/TASK_3_ERP_ARCHITECTURE.html`](./docs/TASK_3_ERP_ARCHITECTURE.html): Standalone interactive browser viewer featuring vector SVG diagram, data flow pathways, and module breakdown.

---

## 🚀 Task 1: Bug Tracker Lite Overview

Bug Tracker Lite is an enterprise-grade issue tracking application built to demonstrate secure API design, strict server-side ownership isolation, and AWS S3 pre-signed upload/download workflows without proxying binary files through the application server.

### Key Highlights
1. **AWS S3 Pre-Signed Workflow:**
   * **Direct Client-to-S3 Upload:** Client requests a pre-signed `PUT` URL via `POST /api/bugs/upload-url` after backend verifies MIME type (`image/jpeg`, `image/png`, `image/webp`) and size ($\le 5\text{MB}$).
   * **Private Bucket Security:** The S3 bucket remains strictly private. Pre-signed `GET` URLs are generated on-demand with a 15-minute expiration for viewing.
   * **Automatic S3 Cleanup:** Deleting a bug automatically deletes its associated object from S3 using AWS SDK v3 `DeleteObjectCommand`.
2. **Server-Side Ownership Protection:**
   * All bug endpoints enforce `bug.userId.toString() === req.user._id.toString()`. Tampering with bug IDs in requests yields `403 Forbidden`.
3. **Authentication & Rate Limiting:**
   * `POST /api/auth/signup` and `POST /api/auth/login` are strictly rate-limited to **5 attempts per minute per IP**, returning structured error responses when exceeded.
4. **Interactive Swagger/OpenAPI Documentation:**
   * Full interactive documentation available at `/api-docs`.

---

## 🛠️ Tech Stack (Mandatory & Bonus)

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express (v20+) | High-throughput asynchronous REST API |
| **Database** | MongoDB + Mongoose | Document DB with compound indexes (`userId` + `status`, `userId` + `createdAt`) |
| **Frontend** | React 18 + Vite + Tailwind CSS | Reactive Single Page Application with Lucide icons |
| **Auth** | JSON Web Tokens (JWT) + BcryptJS | Secure cryptographic auth tokens + 10-round salted password hashing |
| **File Storage** | AWS S3 (AWS SDK v3) | Ephemeral pre-signed PUT/GET URLs; zero server binary transit |
| **Rate Limiter** | Express Rate Limit | 5 attempts/minute per IP window |
| **Documentation**| Swagger UI + OpenAPI 3.0 | Hosted at `http://localhost:5000/api-docs` |
| **Logging** | Winston + Morgan | Structured JSON production logs + HTTP console logging |
| **Testing** | Jest + Supertest + MongoMemoryServer | 19 automated integration and unit test assertions |
| **DevOps** | Docker + Docker Compose + GitHub Actions | Multi-stage Docker builds & CI/CD workflow |

---

## ⚙️ Local Setup Instructions

### Prerequisites
* **Node.js**: v18.x or v20.x or v22.x
* **npm**: v9.x or higher
* **MongoDB**: Local MongoDB instance (`mongod`) OR MongoDB Atlas URI. *(Note: Automated tests do not require MongoDB as they use `mongodb-memory-server`)*.

---

### Step 1: Clone the Repository
```bash
git clone <repo-url>
cd Elovient
```

---

### Step 2: Backend Configuration & Startup

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables in `backend/.env`:
   ```bash
   cp .env.example .env
   ```

   **Environment Variables Reference (`backend/.env`):**
   ```env
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=*

   # MongoDB Connection String (Local or Atlas)
   MONGODB_URI=mongodb://127.0.0.1:27017/bugtracker

   # JWT Auth
   JWT_SECRET=super_secure_jwt_secret_production_key_3892748923
   JWT_EXPIRES_IN=7d

   # AWS S3 Configuration
   # Provide your AWS credentials to use real AWS S3:
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=bug-tracker-lite-attachments
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   ```
   *(Note: If AWS credentials are kept as `mock-access-key`, the server operates in zero-config dev/mock mode for offline testing without crashing).*

3. Start backend development server:
   ```bash
   npm run dev
   # Server runs at http://localhost:5000
   # Swagger docs at http://localhost:5000/api-docs
   ```

---

### Step 3: Frontend Configuration & Startup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   # App runs at http://localhost:3000
   ```

---

## 🧪 Running Automated Tests

A comprehensive suite of 19 automated unit and integration tests is included. It tests all endpoints, rate limits, MIME/size validation, and security ownership constraints.

```bash
cd backend
npm test
```

**Test Suite Coverage Summary:**
* ✅ User Registration (`POST /api/auth/signup`)
* ✅ Duplicate Email Prevention
* ✅ User Authentication & JWT (`POST /api/auth/login`)
* ✅ Credential Rejection
* ✅ Pre-signed Upload URL (`POST /api/bugs/upload-url`)
* ✅ 5MB Max File Size Enforcement
* ✅ Image Format Enforcement (JPG, PNG, WebP)
* ✅ Bug Creation with Validation (`POST /api/bugs`)
* ✅ Bug Listing & Status Filter (`GET /api/bugs?status=open`)
* ✅ Bug Detail View with S3 GET URL (`GET /api/bugs/:id`)
* ✅ **MANDATORY SECURITY TEST:** Reject unauthorized user reading another user's bug (`403 Forbidden`)
* ✅ **MANDATORY SECURITY TEST:** Reject unauthorized user updating another user's bug (`403 Forbidden`)
* ✅ **MANDATORY SECURITY TEST:** Reject unauthorized user deleting another user's bug (`403 Forbidden`)
* ✅ Bug and S3 Image Deletion (`DELETE /api/bugs/:id`)

---

## 🐳 Running with Docker Compose

To spin up the entire full-stack application (MongoDB, Backend, and Frontend Nginx) with a single command:

```bash
docker compose up --build
```
* **Frontend:** `http://localhost` (Port 80)
* **Backend API:** `http://localhost:5000`
* **Swagger API Docs:** `http://localhost:5000/api-docs`
* **MongoDB:** `localhost:27017`

---

## 📡 REST API Reference

### 1. Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user account (rate-limited: 5/min) | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token (rate-limited: 5/min) | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile | Bearer JWT |

### 2. AWS S3 Pre-Signed URLs
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bugs/upload-url` | Generate ephemeral pre-signed S3 upload PUT URL | Bearer JWT |

### 3. Bug Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bugs` | Create bug with title, description, severity, status, imageKey | Bearer JWT |
| `GET` | `/api/bugs` | List user's bugs (optional query: `?status=open`) | Bearer JWT |
| `GET` | `/api/bugs/:id` | View bug details & generate short-lived image URL | Bearer JWT (Owner only) |
| `PUT` | `/api/bugs/:id` | Update bug fields or replace image | Bearer JWT (Owner only) |
| `DELETE` | `/api/bugs/:id` | Delete bug & delete associated image from S3 | Bearer JWT (Owner only) |

---

## ☁️ AWS Production Deployment Architecture

```
[Users / Browsers]
        │
        ▼
[AWS Route 53 DNS]
        │
        ▼
[AWS CloudFront CDN]
   ├── Static Frontend Assets (Origin: Private AWS S3 Bucket)
   └── API Requests /api/* (Origin: AWS Application Load Balancer)
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
             [AWS ECS Fargate Task 1]  [AWS ECS Fargate Task N]
             (Node.js + Express Container in Private Subnet)
                        │                         │
                        ├─────────────────────────┤
                        ▼                         ▼
              [MongoDB Atlas Sharded]     [AWS S3 Private Bucket]
              (AWS PrivateLink VPC)       (Presigned Direct Uploads)
```

1. **Frontend:**
   * Built via `npm run build` and synchronized to an **AWS S3 Bucket** configured as a private web origin.
   * Distributed globally via **AWS CloudFront** with SSL certificate from AWS Certificate Manager (ACM).
2. **Backend:**
   * Containerized via `Dockerfile` and deployed on **AWS ECS Fargate** or **AWS Elastic Beanstalk (Docker)** behind an **Application Load Balancer (ALB)**.
   * Runs in private subnets with NAT gateway egress for external AWS API calls.
3. **Database:**
   * **MongoDB Atlas** running on AWS with VPC Peering or AWS PrivateLink, ensuring zero exposure to public internet.
4. **AWS S3 Security:**
   * S3 Bucket has **Block All Public Access** turned ON.
   * Scoped IAM policy grants least-privilege permissions (`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`) strictly to the application role.

---

## 📄 License & Attribution
Developed by **Nikhil** for the Full Stack Developer role evaluation at **Elovient Software Solutions**.
