const express = require('express');
const router = express.Router();
const {
  getUploadUrl,
  createBug,
  listBugs,
  getBugById,
  updateBug,
  deleteBug,
} = require('../controllers/bugController');
const { protect } = require('../middleware/auth');

// All bug management routes require JWT authentication
router.use(protect);

// Pre-signed S3 upload URL route (must be defined before /:id)
router.post('/upload-url', getUploadUrl);

// Bug CRUD routes
router.route('/')
  .post(createBug)
  .get(listBugs);

router.route('/:id')
  .get(getBugById)
  .put(updateBug)
  .delete(deleteBug);

module.exports = router;
