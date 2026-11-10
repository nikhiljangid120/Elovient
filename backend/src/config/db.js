const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bugtracker';
  
  try {
    // Attempt connecting to local or configured MongoDB instance with a short timeout
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.warn(`Connecting to external MongoDB (${mongoURI}) failed: ${error.message}`);

    // Seamless automatic fallback for local development:
    // If local mongod is not running, boot embedded In-Memory MongoDB automatically!
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Starting Embedded In-Memory MongoDB Server so you can run the app without installing MongoDB...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        
        const conn = await mongoose.connect(memoryUri);
        logger.info(`Embedded In-Memory MongoDB Connected successfully: ${memoryUri}`);
        logger.info('Zero-config database active! You can register, login, and manage bugs without installing local MongoDB.');
        return conn;
      } catch (memError) {
        logger.error(`Failed to launch In-Memory MongoDB: ${memError.message}`);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
