const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Bug Tracker Lite REST API',
    version: '1.0.0',
    description: 'Production-ready REST API for Bug Tracker Lite issue tracking application with JWT authentication, AWS S3 pre-signed upload/download URLs, and ownership protection.',
    contact: {
      name: 'Nikhil (Full Stack Developer Candidate)',
      email: 'nikhil@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Nikhil' },
          email: { type: 'string', example: 'nikhil@example.com' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Bug: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          title: { type: 'string', example: 'Checkout button unresponsive on Safari' },
          description: { type: 'string', example: 'Clicking the pay button does not trigger the stripe modal.' },
          severity: { type: 'string', enum: ['low', 'med', 'high'], example: 'high' },
          status: { type: 'string', enum: ['open', 'in-progress', 'closed'], example: 'open' },
          imageKey: { type: 'string', example: 'bugs/user123/screenshot.png' },
          imageUrl: { type: 'string', example: 'https://bug-tracker-lite.s3.amazonaws.com/...' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/auth/signup': {
      post: {
        summary: 'Register a new user (Rate limited: 5 req/min)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Nikhil' },
                  email: { type: 'string', example: 'nikhil@example.com' },
                  password: { type: 'string', example: 'Secret123!' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully with JWT token' },
          400: { description: 'Validation error or duplicate email' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Log in user and retrieve JWT token (Rate limited: 5 req/min)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'nikhil@example.com' },
                  password: { type: 'string', example: 'Secret123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid email or password' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/bugs/upload-url': {
      post: {
        summary: 'Generate AWS S3 pre-signed upload URL for direct client upload',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileName', 'fileType'],
                properties: {
                  fileName: { type: 'string', example: 'error_screenshot.png' },
                  fileType: { type: 'string', example: 'image/png' },
                  fileSize: { type: 'integer', example: 1048576 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pre-signed upload URL generated' },
          400: { description: 'Invalid file format or file size exceeds 5MB' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/bugs': {
      post: {
        summary: 'Create a new bug',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string', example: 'App crashes on checkout' },
                  description: { type: 'string', example: 'Steps to reproduce: ...' },
                  severity: { type: 'string', enum: ['low', 'med', 'high'], default: 'med' },
                  status: { type: 'string', enum: ['open', 'in-progress', 'closed'], default: 'open' },
                  imageKey: { type: 'string', example: 'bugs/123/screenshot.png' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Bug created successfully' },
          400: { description: 'Validation error' },
        },
      },
      get: {
        summary: 'List authenticated user bugs with status filter',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
            description: 'Filter bugs by status',
          },
        ],
        responses: {
          200: { description: 'List of user bugs' },
        },
      },
    },
    '/api/bugs/{id}': {
      get: {
        summary: 'View a single bug with pre-signed GET image URL',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bug details with pre-signed image URL' },
          403: { description: 'Access denied - bug belongs to another user' },
          404: { description: 'Bug not found' },
        },
      },
      put: {
        summary: 'Update bug details',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'med', 'high'] },
                  status: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
                  imageKey: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Bug updated successfully' },
          403: { description: 'Access denied - bug belongs to another user' },
          404: { description: 'Bug not found' },
        },
      },
      delete: {
        summary: 'Delete bug and remove associated image from AWS S3',
        tags: ['Bugs & S3 Storage'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bug and image deleted successfully' },
          403: { description: 'Access denied - bug belongs to another user' },
          404: { description: 'Bug not found' },
        },
      },
    },
  },
};

module.exports = swaggerDoc;
