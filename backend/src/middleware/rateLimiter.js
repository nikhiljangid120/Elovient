const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Authentication endpoints (login & signup)
 * 5 attempts/min in production.
 * 30 attempts/min in development (to prevent locking out local developer during manual testing).
 * 100 in test suite.
 */
const getDefaultLimit = () => {
  if (process.env.AUTH_RATE_LIMIT_MAX) {
    return Number(process.env.AUTH_RATE_LIMIT_MAX);
  }
  if (process.env.NODE_ENV === 'production') {
    return 5;
  }
  if (process.env.NODE_ENV === 'test') {
    return 100;
  }
  // Development default
  return 30;
};

const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: getDefaultLimit(),
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
