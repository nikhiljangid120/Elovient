const express = require('express');
const router = express.Router();

// In-memory or temporary store for local mock uploads when testing without AWS
const mockS3Storage = new Map();

// Endpoint simulating direct pre-signed S3 PUT
router.put('/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).send('Missing key parameter');
  }

  mockS3Storage.set(key, {
    buffer: req.body,
    contentType: req.headers['content-type'] || 'image/jpeg',
    uploadedAt: new Date(),
  });

  return res.status(200).send('File uploaded to mock S3 successfully');
});

// Endpoint simulating pre-signed S3 GET view
router.get('/view', (req, res) => {
  const { key } = req.query;
  if (!key || !mockS3Storage.has(key)) {
    // Return a clean placeholder image if key not found in mock memory
    return res.redirect('https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80');
  }

  const file = mockS3Storage.get(key);
  res.setHeader('Content-Type', file.contentType);
  return res.send(file.buffer);
});

module.exports = router;
