# Loom / Screen Recording Walkthrough Script (3–5 Minutes)
**Company:** Elovient Software Solutions  
**Candidate:** Nikhil  
**Role:** Full Stack Developer Evaluation  

> [!NOTE]
> This guide outlines a structured, professional narrative to follow when recording your 3–5 minute Loom demonstration for the evaluators.

---

## ⏱️ Timeline & Agenda

* **0:00 – 0:30:** Introduction & Architecture Overview
* **0:30 – 1:15:** User Authentication & Rate Limiting Demonstration
* **1:15 – 2:30:** Bug Creation & S3 Pre-Signed Upload Flow
* **2:30 – 3:30:** Viewing, Filtering & Editing Bugs
* **3:30 – 4:15:** Ownership Security & Bug Deletion (with S3 Cleanup)
* **4:15 – 5:00:** Tasks 2 & 3 Architecture Summary & Wrap-up

---

## 🎬 Step-by-Step Script

### 1. Introduction & Architecture (0:00 – 0:30)
* **What to show:** Open the browser on `http://localhost:3000` with the clean Bug Tracker Lite sign-in screen, or your code editor showing the directory structure.
* **What to say:**
  > *"Hi Yashasvi and the Elovient evaluation team. My name is Nikhil, and this is my submission for the Full Stack Developer role. Today, I'll walk you through Bug Tracker Lite, an issue management application built with Node.js, Express, MongoDB, and React 18, along with the technical proposal for Task 2 and the ERP architecture designed for Task 3."*
  > *"A core architectural highlight of this project is the AWS S3 pre-signed URL pattern. The backend never accepts or proxies raw base64 images; instead, it generates ephemeral, cryptographically signed PUT URLs, allowing the browser to stream screenshots directly to S3. Let's see this in action."*

---

### 2. Authentication & Rate Limiting (0:30 – 1:15)
* **What to show:**
  1. Click **Create Account**, fill in your name, email, and password. Submit the form to show instant JWT issuance and redirection to the dashboard.
  2. Log out and demonstrate the login form.
* **What to say:**
  > *"First, authentication is handled via JSON Web Tokens with 10-round salted Bcrypt password hashing. We also enforce server-side rate limiting on all auth routes, strictly capped at 5 attempts per minute per IP to prevent brute-force attacks."*

---

### 3. Create Bug & AWS S3 Upload Flow (1:15 – 2:30)
* **What to show:**
  1. Click **Report New Bug** to open the modal.
  2. Enter a bug title (e.g., *"Checkout button unresponsive on Safari"*), description, and set severity to **High**.
  3. Drag and drop or select an image (`.png` or `.jpg`). Show the file preview and file size.
  4. Open browser DevTools Network tab (Filter by `Fetch/XHR`).
  5. Click **Submit Bug**.
  6. Point out the two distinct network calls in DevTools:
     - First, `POST /api/bugs/upload-url` returning `{ uploadUrl, imageKey }`.
     - Second, `PUT https://...s3.amazonaws.com/...` with status `200 OK`, streaming the binary directly to S3.
* **What to say:**
  > *"When I click 'Submit Bug', watch the Network tab. The client first requests an upload URL from our Node.js backend. The server validates the MIME type and ensures the image is under 5 megabytes, returning a pre-signed S3 PUT URL with a 5-minute expiration.*
  > *Notice that the browser immediately makes a direct PUT request to AWS S3. The image binary never touches our Express server, saving bandwidth and compute."*

---

### 4. Viewing, Filtering & Editing Bugs (2:30 – 3:30)
* **What to show:**
  1. Return to the dashboard. Show the bug listed with its status and severity badges.
  2. Click the status tabs: **All**, **Open**, **In Progress**, **Closed**. Show the filtered list updating smoothly.
  3. Click into the bug to open **Bug Detail Page**.
  4. Show the attached image rendered via the short-lived pre-signed `GET` URL. Click **Zoom In** to show the lightbox.
  5. Click **Edit Bug**, change the status from *Open* to *In Progress*, and save. Show the live update.
* **What to say:**
  > *"On the dashboard, we have real-time KPI metrics and status filtering. In the Bug Detail view, the screenshot is rendered using a short-lived pre-signed GET URL that expires in 15 minutes. This ensures the S3 bucket remains completely private with zero public read access.*
  > *From here, we can update any field, and the changes are validated and saved back to MongoDB."*

---

### 5. Mandatory Ownership Check & Deletion (3:30 – 4:15)
* **What to show:**
  1. Mention the server-side ownership protection: show that even if someone modifies the bug ID in the URL or via cURL, the backend rejects it with `403 Forbidden`.
  2. Click **Delete Bug**, show the confirmation modal, and confirm.
  3. Show the bug disappearing from the dashboard.
* **What to say:**
  > *"Security was a top priority. In accordance with the prompt, server-side ownership checks are strictly enforced on every GET, PUT, and DELETE endpoint. If a user tries to access or tamper with another user's bug ID, the backend returns 403 Forbidden.*
  > *When I delete this bug, the backend automatically issues a DeleteObjectCommand to AWS S3, ensuring no orphaned image files remain in cloud storage."*

---

### 6. Tasks 2 & 3 Overview & Wrap-Up (4:15 – 5:00)
* **What to show:**
  1. Briefly show `docs/TASK_2_TECHNICAL_PROPOSAL.md` and highlight the OEE computation and edge architecture.
  2. Open `docs/TASK_3_ERP_ARCHITECTURE.html` in Chrome to display the interactive SVG architecture diagram.
* **What to say:**
  > *"Finally, for Task 2, I prepared discovery meeting notes and an end-to-end technical proposal for an automotive production monitoring platform featuring Industrial Edge gateways, TimescaleDB, and real-time OEE dashboards.*
  > *For Task 3, I designed a cloud-native ERP architecture for a paint manufacturer replacing Excel and unifying Tally accounting, complete with an interactive vector diagram.*
  > *Thank you for your time and consideration. All instructions, tests, and documentation are available in the repository. I look forward to speaking with you soon!"*
