# Technical Interview Cheat Sheet & Q&A Guide
**Role:** Full Stack Developer  
**Company:** Elovient Software Solutions  
**Candidate:** Nikhil  

> [!NOTE]
> This document contains comprehensive, senior-level answers to anticipated technical interview questions covering all three tasks in your evaluation.

---

## 🎯 Section 1: Task 1 – Coding Architecture & Security

### Q1: Why did you choose AWS S3 Pre-Signed URLs instead of multipart/form-data upload via Express (e.g., Multer)?
**Answer:**
* **Resource Optimization & Event Loop Performance:** In Node.js, proxying large binary streams (like 5MB screenshots) consumes significant server memory and CPU cycles for buffer handling. At scale, multiple simultaneous uploads block the single-threaded event loop and degrade API response times.
* **Direct-to-Object-Storage Throughput:** Pre-signed URLs delegate the heavy data transfer directly to AWS S3’s globally distributed infrastructure. The backend only handles a lightweight JSON metadata request ($\approx 5\text{ms}$) to sign the URL with IAM credentials and HMAC-SHA256.
* **Security & Clean Architecture:** The backend never receives, stores, or temporarily buffers binary files on disk, eliminating risks of disk exhaustion or local file execution vulnerabilities.

---

### Q2: How did you ensure the S3 bucket remains secure and private?
**Answer:**
1. **Block All Public Access:** The S3 bucket has AWS S3 Block Public Access enabled for all four settings (Acls, BucketPolicy, PublicAcls, PublicBuckets).
2. **Ephemeral Scoped Access:** Images are uploaded using pre-signed `PUT` URLs expiring in 5 minutes (300 seconds), and viewed using pre-signed `GET` URLs expiring in 15 minutes (900 seconds).
3. **Scoped IAM Policy (Principle of Least Privilege):** The backend uses an IAM role strictly restricted to `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` limited to the specific bucket ARN: `arn:aws:s3:::bug-tracker-lite-attachments/*`.
4. **No Public URLs:** The database only stores the unique object key (e.g., `bugs/userId/uuid-filename.png`), never a public S3 URL.

---

### Q3: How did you implement and verify Server-Side Ownership Validation?
**Answer:**
* **Why Client-Side Hiding is Insufficient:** An attacker can easily inspect the DOM, disable button restrictions, or invoke the REST API directly using cURL or Postman with arbitrary bug IDs.
* **Server-Side Enforcement:** On every single-record endpoint (`GET /api/bugs/:id`, `PUT /api/bugs/:id`, `DELETE /api/bugs/:id`), the backend retrieves the bug record by ID and compares its `userId` with the authenticated `req.user._id` extracted from the verified JWT.
* **Response Code:** If there is a mismatch, the server immediately halts processing and responds with **`HTTP 403 Forbidden`** (or `404 Not Found` if resource enumeration protection is desired).
* **Automated Verification:** Verified by 3 dedicated automated integration tests in Jest and the live smoke test harness simulating User 2 attempting to view, edit, and delete User 1’s bug.

---

### Q4: How is Rate Limiting implemented and why is it important for Auth routes?
**Answer:**
* **Implementation:** Implemented using `express-rate-limit` targeting `/api/auth/signup` and `/api/auth/login`. It tracks incoming IP addresses using an in-memory sliding window of 1 minute, capped at 5 attempts per window in production.
* **Threat Mitigation:** Protects against credential stuffing, brute-force dictionary attacks, and denial-of-service (DoS) attempts on cryptographic hashing functions (Bcrypt is intentionally compute-heavy).
* **Response:** When exceeded, returns `HTTP 429 Too Many Requests` with standard `RateLimit-*` headers and a user-friendly JSON message.

---

### Q5: What database indexes did you create and why?
**Answer:**
1. **User Schema:** Unique index on `email` (`{ email: 1 }`, `unique: true`) ensuring duplicate email rejection is enforced at the database storage engine layer (B-Tree).
2. **Bug Schema Compound Indexes:**
   * `{ userId: 1, status: 1 }`: Optimizes the primary query pattern on the dashboard (`GET /api/bugs?status=open`).
   * `{ userId: 1, createdAt: -1 }`: Ensures user bug list queries sorted chronologically are served entirely from memory without an in-memory sorting pass (COLLSCAN avoided; IXSCAN utilized).

---

## 🏭 Section 2: Task 2 – Automotive Production Monitoring Platform

### Q1: Can you explain the OEE formula and how your proposed system calculates it?
**Answer:**
* **Overall Equipment Effectiveness (OEE)** is the gold standard manufacturing metric:
  $$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
* **Availability ($\frac{\text{Operating Time}}{\text{Planned Production Time}}$):** Measures downtime losses (equipment failures, tooling changeovers). The system logs machine start/stop signals via PLC telemetry.
* **Performance ($\frac{\text{Ideal Cycle Time} \times \text{Total Units Produced}}{\text{Operating Time}}$):** Measures speed losses (sub-minute micro-stops, robot speed throttling).
* **Quality ($\frac{\text{Good Units Produced}}{\text{Total Units Produced}}$):** Measures yield losses (scrap parts, rework). Operators enter scrap counts or inline automated laser inspection sensors stream reject codes.
* **Computation Engine:** Edge gateways buffer raw signals and stream aggregated 5-second metrics via MQTT to AWS IoT Core and TimescaleDB, where hypertable continuous aggregates pre-compute OEE per machine, line, and shift.

---

### Q2: Why did you recommend an Edge Gateway instead of connecting PLCs directly to AWS?
**Answer:**
1. **Purdue Model / OT Network Isolation:** Factory shop-floor PLCs (Level 1/2) must never have direct internet connectivity due to cyber-physical security risks (e.g., Stuxnet-style malware). The Edge Gateway resides in the DMZ (Level 3.5) with dual physical NICs separating OT and IT networks.
2. **Protocol Translation:** Industrial machines speak legacy fieldbus protocols (OPC-UA, Modbus TCP, Profinet). The edge gateway translates these into structured JSON over MQTT/TLS.
3. **Store-and-Forward Network Resilience:** Industrial plant internet connections can experience brief outages. The edge gateway buffers telemetry in a local embedded ring buffer (SQLite / RocksDB) for up to 48 hours and auto-syncs to the cloud upon WAN restoration, guaranteeing zero data loss.

---

## 🎨 Section 3: Task 3 – Paint Manufacturing Cloud ERP

### Q1: What specific ERP challenges are unique to paint and chemical manufacturing?
**Answer:**
1. **Pot-Life & Expiry Management:** Unlike discrete manufacturing (e.g., assembling screws), paint raw materials (solvents, biocides, resins, pigments) have strict shelf lives. The inventory module must enforce **FEFO (First-Expired, First-Out)** picking rather than standard FIFO.
2. **Process Formulation (Recipe BOM) & Yield Loss:** Paint production involves fluid blending stages (High-speed dispersion $\to$ Let-down $\to$ Tinting $\to$ QC Viscosity Check $\to$ Packing). Significant evaporation loss occurs with volatile organic solvents; the system must reconcile actual yields against standard BOM formulation variance.
3. **Quality Control Gates:** Finished paint cannot be released to stock without laboratory shade-matching ($\Delta E$ color variance), viscosity, and drying-time sign-off.

---

### Q2: How do you handle the transition from Tally to the new ERP without disrupting business operations?
**Answer:**
* **The "Strangler Fig" Coexistence Pattern:**
  * **Phase 1 (Hybrid Synchronization):** The finance team continues using Tally Prime. The ERP deploys an on-premise Tally XML/ODBC sync connector. When sales dispatches goods or procurement accepts a GRN, the ERP generates Tally-compliant XML accounting vouchers and pushes them to Tally via HTTP port 9000.
  * **Phase 2 (Dual-Run Verification):** Run 1–2 financial quarters in parallel, comparing the ERP's automated General Ledger trial balance and balance sheet directly against Tally reports.
  * **Phase 3 (Cutover):** Once reconciliation achieves 100% parity and GST e-invoicing is operational within the ERP, Tally is switched to read-only archive mode.

---

## ⚡ Section 4: Scalability & Production Readiness

### Q1: If this application had to scale to 10,000 active users tomorrow, what would break first and how would you fix it?
**Answer:**
1. **Database Connection Pool Saturation:**
   * *Problem:* A single MongoDB instance or default 100-connection Mongoose pool saturates under thousands of concurrent requests.
   * *Fix:* Introduce **AWS ElastiCache (Redis)** to cache user issue lists with a 60-second TTL (`user:${id}:bugs`), invalidating only on write operations. This offloads 85%+ of read queries from MongoDB.
2. **Single-Node Event Loop Compute:**
   * *Problem:* A single Node.js process runs on a single CPU core.
   * *Fix:* Deploy backend containers to **AWS ECS Fargate** behind an **Application Load Balancer (ALB)** with target tracking auto-scaling policies based on CPU utilization and request latency.
3. **Pre-Signed URL Cryptographic Overhead:**
   * *Problem:* Generating 100 signed URLs synchronously per list page consumes CPU cycles.
   * *Fix:* Return only `imageKey` in list responses; lazily generate the pre-signed URL only when the user navigates into the single bug view, or utilize **AWS CloudFront Signed Cookies** for edge asset delivery.
