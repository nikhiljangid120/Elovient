# AWS Production Deployment Guide
**Role:** Full Stack Developer Evaluation  
**Company:** Elovient Software Solutions  

This guide provides step-by-step instructions to deploy **Bug Tracker Lite** to AWS in full compliance with the evaluation criteria.

---

## 🏗️ Architecture Overview

```
                      [Route 53 DNS / User]
                                │
                                ▼
                      [CloudFront Distribution]
                       ├── /api/* ──► [Application Load Balancer / EC2]
                       └── /*     ──► [S3 Static Website (Frontend)]

     [EC2 / Elastic Beanstalk]
                │
                ├──► [AWS S3 Private Bucket] (Pre-signed direct uploads & downloads)
                └──► [MongoDB Atlas / RDS] (Encrypted master data)
```

---

## 🪣 Step 1: AWS S3 Private Bucket & IAM Configuration

### 1.1 Create the Private Bucket
1. Go to the AWS S3 Console and click **Create bucket**.
2. **Bucket Name:** `bug-tracker-lite-attachments` (must be globally unique).
3. **Region:** `us-east-1` (or your preferred region).
4. **Block Public Access settings:** Keep **Block *all* public access** checked (mandatory requirement).
5. Enable **Default encryption** (Amazon S3-managed keys - SSE-S3).
6. Click **Create bucket**.

### 1.2 Enable CORS on the S3 Bucket
Since the React frontend uploads images directly to S3 via pre-signed PUT URLs, CORS must allow `PUT` requests:
1. Navigate to the bucket $\to$ **Permissions** tab $\to$ **Cross-origin resource sharing (CORS)**.
2. Paste the following JSON:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 1.3 Create Scoped IAM Policy & User
Create an IAM policy granting least-privilege access strictly for the backend service:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BugTrackerS3ScopedAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::bug-tracker-lite-attachments/*"
    }
  ]
}
```
Attach this policy to your backend IAM user or EC2 Instance Role.

---

## 🖥️ Step 2: Backend Deployment on AWS (Lightsail or EC2)

### Option A: AWS Lightsail (Fastest, Cost-Effective)
1. Open the **AWS Lightsail Console** and click **Create Instance**.
2. Choose **Linux/Unix** $\to$ **OS Only** $\to$ **Ubuntu 22.04 LTS** ($5/month plan).
3. Connect via browser SSH and run:
```bash
# Update and install Node.js 20 & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs git

# Install PM2 Process Manager
sudo npm install -g pm2

# Clone the project
git clone <your-github-repo-url> /var/www/bugtracker
cd /var/www/bugtracker/backend
npm ci --production

# Create production .env file
nano .env
```
4. Populate `/var/www/bugtracker/backend/.env`:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/bugtracker?retryWrites=true&w=majority
JWT_SECRET=super_secret_production_key_98234710
AWS_REGION=us-east-1
AWS_S3_BUCKET=bug-tracker-lite-attachments
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
```
5. Start the backend with PM2:
```bash
pm2 start src/server.js --name "bugtracker-api"
pm2 save
pm2 startup
```
6. Open port 5000 in Lightsail Networking firewall rules.

---

## 🌐 Step 3: Frontend Deployment (AWS S3 + CloudFront)

1. On your local machine, build the production frontend bundle:
```bash
cd frontend
# Set production backend API URL in .env.production
echo "VITE_API_URL=http://<YOUR_EC2_OR_LIGHTSAIL_IP>:5000/api" > .env.production
npm run build
```
2. Create an S3 bucket for the frontend: `bug-tracker-frontend-static`.
3. Enable **Static website hosting** on this bucket:
   - Index document: `index.html`
   - Error document: `index.html` (for client-side routing)
4. Upload all files from `frontend/dist/` to this bucket:
```bash
aws s3 sync dist/ s3://bug-tracker-frontend-static --delete
```
5. Create an **AWS CloudFront Distribution**:
   - Origin Domain: Select your `bug-tracker-frontend-static` S3 website endpoint.
   - Viewer Protocol Policy: **Redirect HTTP to HTTPS**.
   - Custom Error Response: Add error code `404` and `403` returning `/index.html` with HTTP 200 (to support React Router browser refresh).
6. CloudFront assigns a live URL: `https://d12345abcdef.cloudfront.net`.

---

## 🔒 Step 4: Security Checklist Verification
- [x] No AWS credentials or secrets committed to GitHub (`.gitignore` contains `.env`).
- [x] S3 Image Bucket has **Block all public access** enabled.
- [x] IAM credentials limited strictly to `PutObject`, `GetObject`, `DeleteObject`.
- [x] Express backend rate limits auth requests to 5 attempts/min.
- [x] Database queries enforce user ownership validation on every request.

