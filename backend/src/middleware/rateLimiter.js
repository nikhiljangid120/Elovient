const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Authentication endpoints (login & signup)
 * Maximum 5 attempts per 1 minute window per IP address
 */
const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return standard rate limit info in headers (RateLimit-*)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 1 minute.',
      retryAfterSeconds: 60,
    });
  },
});

module.exports = {
  authRateLimiter,
};
