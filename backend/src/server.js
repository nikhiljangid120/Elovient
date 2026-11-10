require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

// Connect to Database and start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Bug Tracker Lite Server running on port ${PORT}`);
    logger.info(`Swagger API Docs available at: http://localhost:${PORT}/api-docs`);
  });
}).catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
});
