const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('./logger');

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET || 'bug-tracker-lite-attachments';

// Check if valid AWS credentials exist
const hasAwsCredentials = Boolean(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_ACCESS_KEY_ID !== 'mock-access-key'
);

let s3Client = null;

if (hasAwsCredentials) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  logger.info(`AWS S3 Client initialized for bucket: ${bucketName} in region: ${region}`);
} else {
  logger.warn('AWS credentials not found or set to mock. Running S3 in simulated dev/test mode.');
}

/**
 * Generate a pre-signed PUT URL for direct frontend client upload
 * @param {string} key S3 object key
 * @param {string} contentType MIME type of image (e.g., image/jpeg)
 * @param {number} expiresIn URL expiration in seconds (default: 300 / 5 minutes)
 */
const generatePresignedUploadUrl = async (key, contentType, expiresIn = 300) => {
  if (s3Client) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Graceful Local / Development Mock fallback
  const mockBaseUrl = process.env.MOCK_S3_ENDPOINT || `http://localhost:${process.env.PORT || 5000}/api/mock-s3`;
  return `${mockBaseUrl}/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}&expires=${Date.now() + expiresIn * 1000}`;
};

/**
 * Generate a short-lived pre-signed GET URL to view/download private image
 * @param {string} key S3 object key
 * @param {number} expiresIn URL expiration in seconds (default: 900 / 15 minutes)
 */
const generatePresignedViewUrl = async (key, expiresIn = 900) => {
  if (!key) return null;

  if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Graceful Local / Development Mock fallback
  const mockBaseUrl = process.env.MOCK_S3_ENDPOINT || `http://localhost:${process.env.PORT || 5000}/api/mock-s3`;
  return `${mockBaseUrl}/view?key=${encodeURIComponent(key)}&expires=${Date.now() + expiresIn * 1000}`;
};

/**
 * Delete an object from S3 when bug is deleted
 * @param {string} key S3 object key
 */
const deleteS3Object = async (key) => {
  if (!key) return true;

  if (s3Client) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await s3Client.send(command);
      logger.info(`Successfully deleted image from S3: ${key}`);
      return true;
    } catch (err) {
      logger.error(`Error deleting image from S3 (${key}): ${err.message}`);
      return false;
    }
  }

  logger.info(`[Dev/Mock] Simulating deletion of S3 object: ${key}`);
  return true;
};

module.exports = {
  s3Client,
  bucketName,
  generatePresignedUploadUrl,
  generatePresignedViewUrl,
  deleteS3Object,
};
