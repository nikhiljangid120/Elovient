# Task 2: Meeting Notes Simulation & Technical Proposal
**Project:** Next-Generation Automotive Production Monitoring & Intelligence Platform  
**Client:** Apex Automotive Manufacturing Plant  
**Prepared by:** Nikhil (Full Stack Developer Candidate)  
**Date:** November 2026  
**Document Version:** 1.0.0

---

## Part 1: Meeting Notes Simulation

### 1.1 Meeting Metadata
* **Meeting Topic:** Production Monitoring Platform Discovery & Technical Feasibility
* **Date & Time:** November 08, 2026 | 10:00 AM – 11:30 AM IST
* **Location:** Virtual Conference / Commerz II Conference Room
* **Attendees:**
  * **Client Stakeholders:**
    * Rajesh Sharma (VP of Manufacturing Operations)
    * Vikram Mehta (Plant General Manager)
    * Sunita Rao (Lead Automation & Industrial IoT Engineer)
    * Deepak Patel (Enterprise IT & Security Lead)
  * **Consulting & Engineering Team:**
    * Nikhil (Lead Full Stack & Cloud Architect)
    * Yashasvi Poojary (Project Management Lead)

---

### 1.2 Key Discussion Points

1. **Current State & Pain Points:**
   * The automotive plant operates **4 primary production lines** (Stamping, Body-in-White Welding, Paint Shop, and Final Assembly) across 3 daily shifts.
   * Currently, shift production metrics, machine downtime, and scrap numbers are collected manually via whiteboards and paper logs, aggregated into Excel sheets with a **4 to 8-hour latency**.
   * By the time plant managers identify a bottleneck or quality anomaly, hundreds of defective units have potentially passed downstream, leading to substantial rework costs.

2. **Target Objectives & Functional Requirements:**
   * **Real-time OEE (Overall Equipment Effectiveness) Monitoring:** Availability, Performance, and Quality tracking updated with sub-second to 5-second latency.
   * **Automated Downtime Categorization:** Immediate alert when a robotic cell or stamping press stops for >60 seconds, prompting operators on line terminals to assign standard downtime codes (e.g., *Mechanical Jam, Tool Change, Starvation, Blockage*).
   * **Executive & Supervisory Dashboards:** Real-time visibility into planned vs. actual output per line, per shift, and per vehicle model.
   * **Automated Stakeholder Reporting:** Automated end-of-shift reports sent to shift supervisors and executive daily summaries via Email and PDF exports.

3. **OT/IT Infrastructure & Connectivity:**
   * Stamping and Welding lines feature modern Siemens S7-1500 and Beckhoff PLCs supporting **OPC-UA**.
   * Older press lines utilize legacy Modbus TCP / digital I/O.
   * Factory floor operates on an isolated OT network (Purdue Model Level 2/3). Cloud connectivity must pass through an OT-to-IT DMZ security gateway.

---

### 1.3 Critical Assumptions & Constraints
* **A1 (Network Resilience):** Production lines must continue logging data locally if plant WAN/internet connectivity drops; edge gateways must buffer up to 48 hours of time-series telemetry and auto-sync upon reconnection.
* **A2 (OT Security):** No external inbound connections to the factory floor network. All data egress must be unidirectional and initiated from inside the plant via TLS 1.3 / MQTT-over-WebSockets.
* **A3 (Data Ingestion Volume):** 4 lines with approximately 150 critical telemetry tags (vibration, cycle times, temperature, torque, parts count) sampled at 1 Hz = ~150 to 300 data points per second (easily handled by scalable cloud ingestion).
* **A4 (Stakeholder Roles):** Three user personas:
  1. *Floor Operator / Line Lead:* Touchscreen UI for downtime reason codes and hourly targets.
  2. *Plant Manager / Quality Engineer:* Deep-dive analytics, cycle time histograms, defect heatmaps.
  3. *C-Suite Executive:* High-level KPI dashboards on mobile/tablet.

---

### 1.4 Decisions & Alignment
* **Decided:** Adopt an **Edge-to-Cloud Hybrid Architecture** using lightweight Edge Gateways running Node-RED / Kanto / Docker on the factory floor, streaming structured telemetry to AWS via AWS IoT Core / MQTT.
* **Decided:** Web-based responsive Single Page Application (React + Tailwind + WebSockets / SSE) providing real-time cockpit views with zero client-side installation.
* **Decided:** Phase 1 will pilot the solution on the **Welding and Assembly lines**, validating business value within 8 weeks prior to plant-wide rollout.

---

## Part 2: Technical Proposal Document

### 2.1 Executive Summary
Apex Automotive requires a modern, scalable, and resilient **Production Monitoring & Intelligence Platform** to transition from reactive post-shift spreadsheets to proactive, sub-second production performance management. This proposal outlines an enterprise-grade cloud-native solution combining **Industrial Edge Computing**, **Real-Time Stream Processing**, **Time-Series Analytics**, and an **Intuitive React Web Dashboard**.

---

### 2.2 System Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                           1. INDUSTRIAL OT LAYER (Shop Floor)                    |
|   +-------------------+    +--------------------+    +------------------------+   |
|   | Siemens / Beckhoff|    | Modbus Sensors     |    | Manual Operator Term.  |   |
|   | PLCs (OPC-UA)     |    | (Torque, Temp)     |    | (Touchscreen Web PWA)  |   |
|   +---------+---------+    +---------+----------+    +-----------+------------+   |
+-------------|------------------------|---------------------------|----------------+
              |                        |                           |
+-------------v------------------------v---------------------------+----------------+
|                           2. INDUSTRIAL EDGE GATEWAY                              |
|   - Protocol Translation (OPC-UA / Modbus -> JSON)                                |
|   - Local SQLite / RocksDB Ring Buffer (48h offline store-and-forward)             |
|   - Edge Rule Engine (Sub-second emergency threshold alert)                       |
|   - Outbound TLS 1.3 Mutual Auth (AWS IoT Greengrass / MQTT Client)               |
+--------------------------------------|--------------------------------------------+
                                       | Encrypted WAN / MQTT Egress
+--------------------------------------v--------------------------------------------+
|                           3. CLOUD INGESTION & DATA STREAMING (AWS)              |
|   +---------------------------------------------------------------------------+   |
|   | AWS IoT Core (Broker with X.509 Device Certificates)                      |   |
|   +-------------------------------------+-------------------------------------+   |
|                                         |                                         |
|                 +-----------------------+-----------------------+                 |
|                 |                                               |                 |
|       +---------v----------+                         +----------v---------+       |
|       | Hot Path (Realtime)|                         | Cold Path (History)|       |
|       | Apache Kafka /     |                         | AWS S3 Data Lake   |       |
|       | AWS Kinesis Stream |                         | Parquet / Glue     |       |
|       +---------+----------+                         +----------+---------+       |
+-----------------|-----------------------------------------------|-----------------+
                  |                                               |
+-----------------v-----------------------------------------------v-----------------+
|                           4. PROCESSING & PERSISTENCE LAYER                      |
|   +----------------------------------+    +-----------------------------------+   |
|   | Real-Time Engine (Node.js/Go)   |    | TimescaleDB / InfluxDB            |   |
|   | OEE Calculation, Anomaly Alert   |    | (Time-series telemetry & metrics) |   |
|   +-----------------+----------------+    +-----------------+-----------------+   |
|                     |                                       |                     |
|   +-----------------v---------------------------------------v-----------------+   |
|   | PostgreSQL Database (Master Data: Lines, Shifts, Users, Assets, Downtime) |   |
|   | Redis Cache (Live machine state, current shift aggregates, JWT sessions)  |   |
|   +---------------------------------------------------------------------------+   |
+--------------------------------------|--------------------------------------------+
                                       |
+--------------------------------------v--------------------------------------------+
|                           5. APPLICATION & API LAYER                              |
|   - Node.js + Express / NestJS REST APIs (Secure JWT + RBAC Auth)                 |
|   - WebSocket / SSE Gateway (Real-time telemetry push to browser clients)        |
|   - Scheduled Background Workers (BullMQ / AWS Lambda for shift reports)         |
+--------------------------------------|--------------------------------------------+
                                       |
+--------------------------------------v--------------------------------------------+
|                           6. PRESENTATION & CONSUMPTION LAYER                     |
|   +-------------------+    +--------------------+    +------------------------+   |
|   | React 18+ Web App |    | Automated Reporting|    | Instant Alert Engine   |   |
|   | (Tailwind, Charts)|    | (PDF Shift Reports,|    | (Slack, WhatsApp, SMS, |   |
|   | Real-time Cockpit |    | Email Summaries)   |    | Webhook Integration)   |   |
+-----------------------------------------------------------------------------------+
```

---

### 2.3 Core Functional Modules

#### 1. Real-Time OEE Engine
* **Formula:** $\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$
  * *Availability:* $\frac{\text{Operating Time}}{\text{Planned Production Time}}$ (captures downtime, changeovers).
  * *Performance:* $\frac{\text{Ideal Cycle Time} \times \text{Total Parts}}{\text{Operating Time}}$ (captures micro-stops and slow speed).
  * *Quality:* $\frac{\text{Good Parts Produced}}{\text{Total Parts Produced}}$ (captures scrap and rework).
* Dynamically computed per machine, per cell, and aggregated at line and plant levels.

#### 2. Interactive Operator & Supervisory Cockpit
* **Status Kanban & Live Line Visualizer:** Color-coded status indicators (🟢 Running, 🟡 Slow/Idling, 🔴 Unplanned Stop, 🔵 Planned Maintenance).
* **Root-Cause Downtime Attribution:** One-touch categorization for line supervisors with customized Pareto breakdown.
* **Live Hourly Target Tracker:** Visual progress bars contrasting actual output against hourly shift quotas.

#### 3. Automated Reporting & Insight Distribution
* **Shift Handover Reports:** Auto-generated 10 minutes prior to shift end; delivered to oncoming supervisors with open defects and maintenance flags.
* **Executive Morning Digest:** Automated high-level PDF/HTML dashboard emailed at 7:00 AM daily with plant-wide OEE, scrap percentage, and top 5 loss areas.

---

### 2.4 Technology Stack

| Layer | Component | Selection & Rationale |
| :--- | :--- | :--- |
| **Edge Hardware** | Advantech / Siemens IPC | Ruggedized industrial PC with dual NICs for OT/IT network isolation. |
| **Edge Software** | Docker + Node-RED / Edge Client | Lightweight, protocol-agnostic conversion (OPC-UA/Modbus to MQTT). |
| **Cloud Broker** | AWS IoT Core | Managed TLS MQTT broker with mutual certificate auth and 99.99% SLA. |
| **Backend Services**| Node.js + Express (TypeScript) | High-concurrency event-loop, ideal for I/O heavy streaming & WebSockets. |
| **Real-Time Comm** | WebSockets (Socket.io) / SSE | Sub-200ms latency updates to browser screens without polling overhead. |
| **Databases** | TimescaleDB (PostgreSQL) + Redis | Hypertables for high-throughput time-series data; Redis for instant cache. |
| **Frontend UI** | React 18 + Tailwind CSS + Recharts | Modular, reactive component architecture with high-density data charts. |
| **Containerization**| Docker & Docker Compose / ECS | Repeatable, portable deployment for both on-prem and cloud environments. |

---

### 2.5 Security & Industrial Compliance
1. **Network Segmentation (Purdue Enterprise Model):** The Edge Gateway sits between Level 2 (Cell Control) and Level 4 (Enterprise Network) with dual physical NICs, preventing internet traffic from reaching critical PLCs.
2. **Mutual TLS (mTLS):** Edge devices authenticate to AWS IoT Core using unique per-device X.509 certificates.
3. **Role-Based Access Control (RBAC):** Strict JWT-based authorization segmenting *Floor Operators*, *Maintenance Engineers*, *Plant Managers*, and *Corporate Executives*.
4. **Data Privacy & Audit Logging:** Immutable audit logs capturing every manual downtime code change or threshold override.

---

### 2.6 Testing & Quality Assurance Strategy
1. **Edge Simulator Test Harness:** Python mock script simulating 4 production lines emitting realistic sensor readings, random machine faults, and scrap spikes at 500 ms intervals.
2. **Resilience & Network Disconnection Testing:** Simulated WAN failure to confirm edge buffer persistence and zero-data-loss synchronization upon network restoration.
3. **High-Load Benchmarking:** k6 / Artillery load testing targeting 1,000 concurrent browser sessions and 5,000 telemetry messages/sec to ensure sub-50ms API response times.
4. **End-to-End Automated Testing:** Jest and Supertest for API services; Cypress/Playwright for critical frontend user journeys (downtime code submission, PDF export).

---

### 2.7 Phased Implementation Roadmap

```
+-----------------------------------------------------------------------------------+
| Phase 1: Weeks 1-4 | Pilot Setup, Edge Hardware Provisioning & Telemetry Test     |
|                      - Install edge gateways on Welding & Assembly lines          |
|                      - OPC-UA tag mapping & secure MQTT pipeline to cloud         |
+-----------------------------------------------------------------------------------+
| Phase 2: Weeks 5-8 | Core Backend Services, OEE Engine & React Live Dashboard     |
|                      - TimescaleDB schema & streaming OEE computation             |
|                      - Real-time WebSocket visualizer for plant floor displays    |
+-----------------------------------------------------------------------------------+
| Phase 3: Weeks 9-11| Operator Touchscreens, Alerting Engine & Automated Reports   |
|                      - Downtime tagging UI, Slack/Email alerts, PDF generation    |
+-----------------------------------------------------------------------------------+
| Phase 4: Weeks 12+ | Plant-Wide Rollout, Training, and Predictive Maintenance     |
|                      - Scaling to Stamping & Paint lines; operator training       |
+-----------------------------------------------------------------------------------+
```

---

### 2.8 Key Recommendations for Success
1. **Start with Pilot Lines First:** Deploy on the Welding and Final Assembly lines first to establish immediate trust with floor supervisors before full plant deployment.
2. **Involve Floor Operators in UI Design:** Keep downtime logging screens touch-friendly with no more than 2 taps required to categorize a stoppage.
3. **Leverage Standard Industrial Protocols:** Standardize on OPC-UA to minimize vendor lock-in across different PLC brands.
4. **Prioritize Edge Buffering:** Always assume industrial plant internet connections can be intermittent; edge buffering ensures 100% data fidelity.
