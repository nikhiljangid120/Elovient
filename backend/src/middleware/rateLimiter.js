const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Authentication endpoints (login & signup)
 * Maximum 5 attempts per 1 minute window per IP address in production.
 * Configurable via AUTH_RATE_LIMIT_MAX env variable.
 */
const maxLimit = process.env.AUTH_RATE_LIMIT_MAX
  ? Number(process.env.AUTH_RATE_LIMIT_MAX)
  : (process.env.NODE_ENV === 'test' ? 100 : 5);

const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: maxLimit,
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
