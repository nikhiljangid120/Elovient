# Evaluation Engineering Notes (NOTES.md)
**Candidate:** Nikhil  
**Role:** Full Stack Developer Evaluation  
**Company:** Elovient Software Solutions  

---

## 1. What You Prioritized Within the Available Time

Within the provided timeframe, I prioritized architectural soundness, production security, and end-to-end functionality across all three assignment tasks:

1. **Strict Server-Side Ownership & Security Hardening:**
   * Ownership verification is enforced at the database query level on every `GET /:id`, `PUT /:id`, and `DELETE /:id` endpoint. Even if an attacker manipulates the bug ID in the URL, Postman, or cURL, the backend returns `403 Forbidden` and prevents unauthorized data leaks or state modification.
   * Authentication APIs (`/api/auth/login`, `/api/auth/signup`) are protected by an express rate limiter strictly capped at **5 requests per minute per IP** to prevent brute-force attacks.
2. **True AWS S3 Pre-signed URL Workflow:**
   * Zero base64 payload transfer to the backend server. The backend validates the MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size ($\le 5\text{MB}$), then yields an ephemeral, scoped pre-signed `PUT` URL.
   * The client streams the raw binary directly to S3.
   * View access is mediated via short-lived pre-signed `GET` URLs, keeping the S3 bucket 100% private.
   * Bug deletion triggers AWS SDK v3 `DeleteObjectCommand` to eliminate orphaned S3 assets.
3. **Automated Test Coverage & Regression Safety:**
   * Implemented 19 automated tests with Jest, Supertest, and `mongodb-memory-server`, covering auth, input validation, upload limits, bug lifecycle, and ownership authorization.
4. **Comprehensive Bonus Items:**
   * Swagger/OpenAPI 3.0 documentation (`/api-docs`), structured Winston logging, compound database indexing, multi-stage Dockerfiles, and GitHub Actions CI/CD workflows.

---

## 2. What You Deliberately Skipped

To deliver a high-quality, production-tested application within the 24-hour deadline, I deliberately scoped out certain non-core features:
* **Complex Multi-Tenant RBAC / Teams:** The scope specifies individual user bug tracking. I skipped organizational team hierarchies (e.g., project workspaces, invites, manager-developer roles) in favor of bulletproof individual user isolation.
* **Multipart Chunked Resumable Uploads (S3 Multi-part):** Since attachments are restricted to screenshots under 5MB, standard single-operation pre-signed `PUT` URLs are faster, less complex, and avoid multipart abort cleanup costs.
* **Client-Side Image Manipulation / Cropping:** Rather than bundling heavy image cropping libraries in React, the application relies on direct binary upload and client-side aspect-ratio previewing.
* **Email Verification & Password Reset Mailers:** Omitted external SMTP third-party dependencies (SendGrid/SES) to keep local and test runners 100% self-contained without requiring active email API keys.

---

## 3. Why You Selected PostgreSQL or MongoDB

I selected **MongoDB (with Mongoose ODM)** for this implementation:
1. **Document-Model Alignment with Issue Payloads:**
   * Bug tracking systems frequently evolve to include polymorphic metadata (e.g., custom environment tags, browser versions, operating system details, error stack traces, and future custom fields). MongoDB's dynamic schema allows this without expensive SQL schema migrations (`ALTER TABLE`).
2. **Performance on Targeted Reads & Compound Indexes:**
   * The application's dominant query pattern is fetching a user's issues sorted by creation date or filtered by status. MongoDB compound indexes (`{ userId: 1, status: 1 }` and `{ userId: 1, createdAt: -1 }`) serve this query directly in-memory from the index tree (B-Tree index scan), yielding sub-millisecond retrieval.
3. **Native JSON Serialization:**
   * Eliminates Object-Relational Impedance Mismatch between Node.js and the database, accelerating API response serialization and lowering CPU overhead.

*(Note: For enterprise systems requiring double-entry accounting—such as the ERP system designed in Task 3—I explicitly recommend PostgreSQL for strict ACID transactional guarantees).*

---

## 4. Why Did You Select Your AWS Deployment Approach?

### Recommended AWS Architecture:
* **Frontend:** Static build deployed to **AWS S3** configured for website hosting, fronted by **AWS CloudFront (CDN)** with SSL termination via AWS Certificate Manager (ACM).
* **Backend:** Containerized Node.js API deployed on **AWS Elastic Beanstalk (Docker)** or **AWS ECS Fargate** behind an **Application Load Balancer (ALB)**.
* **Database:** **MongoDB Atlas (AWS PrivateLink)** or **AWS DocumentDB**.
* **Storage:** **AWS S3** private bucket with scoped IAM bucket policy.

### Rationale:
1. **Cost Efficiency & Scalability Separation:** Serving the static React bundle via CloudFront + S3 incurs virtually zero server compute cost, offloads 90% of requests to edge cache, and guarantees sub-30ms static asset delivery globally.
2. **Stateless Compute:** Running the Express backend on ECS Fargate / Elastic Beanstalk allows seamless horizontal auto-scaling based on CPU/memory metrics without managing underlying EC2 virtual machines.
3. **Principle of Least Privilege (Security):** The S3 image bucket has **"Block All Public Access"** enabled. The backend IAM role only has `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions restricted to `arn:aws:s3:::bug-tracker-lite-attachments/*`.

---

## 5. If the Application Needed to Support 10,000 Users Tomorrow, What Would Break First and What Would You Change?

### What Would Break First:
1. **Database Connection Pool Exhaustion:**
   * If 10,000 active users send simultaneous requests, a single MongoDB instance or standard Mongoose pool (default 100 connections) would saturate, causing HTTP 504 gateway timeouts.
2. **Synchronous S3 Pre-Signed GET URL Generation in Bulk Endpoints:**
   * When loading a dashboard with 100 bugs per page, generating 100 cryptographic pre-signed GET signatures synchronously in Node.js event-loop compute blocks the thread and spikes latency.
3. **Single Node Backend CPU Bottleneck:**
   * A single Node.js process runs on a single event-loop core. Under 10,000 concurrent connections, CPU utilization would reach 100%, queueing requests and dropping connections.

---

### Architectural Remediation Plan (Scaling to 10,000+ Users):

```
                                      AWS Route 53
                                           │
                                    AWS CloudFront (CDN)
                                 ┌─────────┴─────────┐
                        Static Assets (S3)       API Requests (/api/*)
                                                     │
                                            AWS Application Load Balancer
                                                     │
                                      ┌──────────────┴──────────────┐
                               ECS Task 1 (Node)              ECS Task N (Node)
                                      │                             │
                        ┌─────────────┴─────────────┐               │
                        ▼                           ▼               ▼
                 AWS ElastiCache (Redis)         MongoDB Atlas Sharded Cluster
              (Live Cache, JWT Blacklist)         (Replica Set + Read Replicas)
```

1. **Horizontal Auto-Scaling & Load Balancing:**
   * Deploy the Node.js backend across an **ECS Fargate cluster with an Application Load Balancer (ALB)**. Configure auto-scaling policies to scale container tasks from 2 to 20 based on target tracking (CPU > 70% or Target Response Time < 150ms).
2. **Redis In-Memory Caching (AWS ElastiCache):**
   * Cache user bug lists and bug metadata in Redis with a 60-second TTL: `cache_key = "user:${userId}:bugs:${status}"`.
   * Invalidate or update the cache key immediately upon `POST`, `PUT`, or `DELETE`. This removes 85% of read queries from hitting MongoDB.
3. **CloudFront Signed URLs or Lazy S3 Image Signing:**
   * Instead of generating S3 signed URLs during list queries, only return `imageKey` in list responses, and generate the pre-signed URL lazily when the user navigates into the single bug view.
   * Alternatively, use **AWS CloudFront Signed Cookies** or Signed URLs with private S3 origins for faster CDN edge delivery.
4. **Database Read Replicas & Connection Pooling:**
   * Implement a MongoDB replica set with 1 Primary (writes) and 2+ Secondary Read Replicas (reads). Direct read queries using `readPreference('secondaryPreferred')`.
   * Configure AWS RDS Proxy / MongoDB connection limits to prevent pool exhaustion.
5. **Rate Limiting via Edge (AWS WAF):**
   * Move IP-based rate limiting off the Node.js process onto **AWS WAF (Web Application Firewall)** at the CloudFront/ALB edge. Malicious spikes are dropped before consuming backend memory or bandwidth.
