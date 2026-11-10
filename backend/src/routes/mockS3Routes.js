const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Persistent directory on disk for local mock S3 uploads
const storageDir = path.join(__dirname, '../../.data/mock-s3');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Helper to sanitize key for disk storage
const getFilePath = (key) => {
  const safeName = encodeURIComponent(key).replace(/%/g, '_');
  return path.join(storageDir, safeName);
};

const getMetaPath = (key) => {
  return `${getFilePath(key)}.meta.json`;
};

// Endpoint simulating direct pre-signed S3 PUT
router.put('/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).send('Missing key parameter');
  }

  const filePath = getFilePath(key);
  const metaPath = getMetaPath(key);
  const contentType = req.headers['content-type'] || 'image/jpeg';

  try {
    fs.writeFileSync(filePath, req.body);
    fs.writeFileSync(metaPath, JSON.stringify({ contentType, uploadedAt: new Date() }));
    return res.status(200).send('File uploaded to mock S3 successfully');
  } catch (err) {
    return res.status(500).send(`Failed to store mock S3 file: ${err.message}`);
  }
});

// Endpoint simulating pre-signed S3 GET view
router.get('/view', (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).send('Missing key parameter');
  }

  const filePath = getFilePath(key);
  const metaPath = getMetaPath(key);

  if (fs.existsSync(filePath)) {
    let contentType = 'image/jpeg';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        contentType = meta.contentType || contentType;
      } catch (e) {
        // use default
      }
    }
    res.setHeader('Content-Type', contentType);
    return res.sendFile(path.resolve(filePath));
  }

  // Fallback to high-quality placeholder if file was removed or from previous run
  return res.redirect('https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80');
});

module.exports = router;
