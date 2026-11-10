const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./config/swaggerDoc');
const authRoutes = require('./routes/authRoutes');
const bugRoutes = require('./routes/bugRoutes');
const mockS3Routes = require('./routes/mockS3Routes');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Request parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Swagger API Documentation UI (Bonus #6)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Root Landing Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Bug Tracker Lite API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #334155; max-width: 540px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .badge { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; display: inline-block; margin-bottom: 16px; }
        h1 { font-size: 1.8rem; margin: 0 0 10px; color: #fff; }
        p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 24px; line-height: 1.5; }
        .btn-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn { padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: 0.2s; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #334155; color: #f8fafc; }
        .btn-secondary:hover { background: #475569; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Backend Server Online</span>
        <h1>Bug Tracker Lite API</h1>
        <p>The REST API service is running on port 5000 with JWT authentication, AWS S3 pre-signed upload URLs, and rate limiting.</p>
        <div class="btn-group">
          <a href="http://localhost:3000" class="btn btn-primary">Open Frontend Web App →</a>
          <a href="/api-docs" class="btn btn-secondary">📖 Swagger API Docs</a>
          <a href="/api/health" class="btn btn-secondary">💓 Health Check</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Bug Tracker Lite API',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/mock-s3', mockS3Routes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
