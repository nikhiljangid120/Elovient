import api from './api';
import axios from 'axios';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates the image file before upload
 * @param {File} file 
 * @returns {string|null} Error string if invalid, or null if valid
 */
export const validateImageFile = (file) => {
  if (!file) return 'Please select a file to upload.';
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return 'Invalid file format. Only JPG, JPEG, PNG, and WebP images are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return `File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is 5MB.`;
  }
  return null;
};

/**
 * Executes direct-to-S3 upload using pre-signed upload URL
 * 1. Request pre-signed PUT URL from backend API
 * 2. Upload file directly to AWS S3 bucket
 * 3. Return the persistent S3 object key
 * 
 * @param {File} file The image file selected by user
 * @param {Function} onProgress Progress callback (percent: number)
 * @returns {Promise<{ imageKey: string }>}
 */
export const uploadImageToS3 = async (file, onProgress) => {
  // Step 1: Pre-upload client validation
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // Step 2: Request pre-signed S3 upload URL from Backend
  const { data } = await api.post('/bugs/upload-url', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  const { uploadUrl, imageKey } = data;

  if (!uploadUrl || !imageKey) {
    throw new Error('Server failed to provide a valid S3 upload URL.');
  }

  // Step 3: Direct PUT request to S3 (no backend payload transfer)
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return { imageKey };
};
