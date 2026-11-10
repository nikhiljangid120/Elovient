const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Bug = require('../models/Bug');
const {
  generatePresignedUploadUrl,
  generatePresignedViewUrl,
  deleteS3Object,
} = require('../config/s3');
const logger = require('../config/logger');

// Allowed MIME types & size limit for S3 uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// @desc    Generate S3 pre-signed upload URL
// @route   POST /api/bugs/upload-url
// @access  Private
const getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fileName and fileType.',
      });
    }

    // 1. Accept only JPG/JPEG, PNG, or WebP images
    if (!ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only JPG, JPEG, PNG, and WebP images are allowed.',
      });
    }

    // 2. Maximum file size: 5 MB
    if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit. Please upload an image smaller than 5MB.',
      });
    }

    // 3. Generate unique S3 object key
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `bugs/${req.user._id}/${uuidv4()}-${cleanFileName}`;

    // 4. Generate S3 pre-signed PUT URL (expires in 5 minutes / 300 seconds)
    const uploadUrl = await generatePresignedUploadUrl(objectKey, fileType, 300);

    return res.status(200).json({
      success: true,
      uploadUrl,
      imageKey: objectKey,
      expiresInSeconds: 300,
    });
  } catch (error) {
    logger.error(`Error generating upload URL: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate pre-signed upload URL.',
    });
  }
};

// @desc    Create a new bug
// @route   POST /api/bugs
// @access  Private
const createBug = async (req, res) => {
  try {
    const { title, description, severity, status, imageKey } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.',
      });
    }

    // Validate severity if provided
    if (severity && !['low', 'med', 'high'].includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Severity must be either "low", "med", or "high".',
      });
    }

    // Validate status if provided
    if (status && !['open', 'in-progress', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "open", "in-progress", or "closed".',
      });
    }

    // Associate bug with the authenticated user
    const bug = await Bug.create({
      userId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      severity: severity || 'med',
      status: status || 'open',
      imageKey: imageKey || null,
    });

    let imageUrl = null;
    if (bug.imageKey) {
      imageUrl = await generatePresignedViewUrl(bug.imageKey);
    }

    return res.status(201).json({
      success: true,
      message: 'Bug created successfully',
      bug: {
        ...bug.toJSON(),
        imageUrl,
      },
    });
  } catch (error) {
    logger.error(`Error creating bug: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating bug.',
    });
  }
};

// @desc    List authenticated user's bugs (with status filtering)
// @route   GET /api/bugs
// @access  Private
const listBugs = async (req, res) => {
  try {
    const query = { userId: req.user._id };

    // Support filtering by status (?status=open)
    if (req.query.status && ['open', 'in-progress', 'closed'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const bugs = await Bug.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bugs.length,
      bugs,
    });
  } catch (error) {
    logger.error(`Error listing bugs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching bugs.',
    });
  }
};

// @desc    View a single bug (with pre-signed image URL)
// @route   GET /api/bugs/:id
// @access  Private
const getBugById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    const bug = await Bug.findById(id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    // MANDATORY Server-side ownership validation
    if (bug.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this bug.',
      });
    }

    let imageUrl = null;
    if (bug.imageKey) {
      imageUrl = await generatePresignedViewUrl(bug.imageKey);
    }

    return res.status(200).json({
      success: true,
      bug: {
        ...bug.toJSON(),
        imageUrl,
      },
    });
  } catch (error) {
    logger.error(`Error getting bug details: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching bug details.',
    });
  }
};

// @desc    Edit a bug
// @route   PUT /api/bugs/:id
// @access  Private
const updateBug = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, severity, status, imageKey } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    const bug = await Bug.findById(id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    // MANDATORY Server-side ownership validation
    if (bug.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot edit another user\'s bug.',
      });
    }

    // Validate fields
    if (severity && !['low', 'med', 'high'].includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Severity must be either "low", "med", or "high".',
      });
    }

    if (status && !['open', 'in-progress', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "open", "in-progress", or "closed".',
      });
    }

    // If image is being replaced, clean up the old image from S3
    if (imageKey && bug.imageKey && imageKey !== bug.imageKey) {
      await deleteS3Object(bug.imageKey);
    }

    if (title !== undefined) bug.title = title.trim();
    if (description !== undefined) bug.description = description.trim();
    if (severity !== undefined) bug.severity = severity;
    if (status !== undefined) bug.status = status;
    if (imageKey !== undefined) bug.imageKey = imageKey;

    await bug.save();

    let imageUrl = null;
    if (bug.imageKey) {
      imageUrl = await generatePresignedViewUrl(bug.imageKey);
    }

    return res.status(200).json({
      success: true,
      message: 'Bug updated successfully',
      bug: {
        ...bug.toJSON(),
        imageUrl,
      },
    });
  } catch (error) {
    logger.error(`Error updating bug: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating bug.',
    });
  }
};

// @desc    Delete a bug & its S3 image
// @route   DELETE /api/bugs/:id
// @access  Private
const deleteBug = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    const bug = await Bug.findById(id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    // MANDATORY Server-side ownership validation
    if (bug.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot delete another user\'s bug.',
      });
    }

    // Delete image from S3 if present
    if (bug.imageKey) {
      await deleteS3Object(bug.imageKey);
    }

    // Delete bug from MongoDB
    await Bug.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Bug and associated screenshot deleted successfully.',
    });
  } catch (error) {
    logger.error(`Error deleting bug: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting bug.',
    });
  }
};

module.exports = {
  getUploadUrl,
  createBug,
  listBugs,
  getBugById,
  updateBug,
  deleteBug,
};
