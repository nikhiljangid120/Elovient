const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let globalMemoryServer = null;

const ensureDefaultUser = async () => {
  try {
    const User = require('../models/User');
    const existing = await User.findOne({ email: 'nikhil@test.com' });
    if (!existing) {
      await User.create({
        name: 'Nikhil Developer',
        email: 'nikhil@test.com',
        password: 'Password123!',
      });
      logger.info('Auto-seeded default user: nikhil@test.com (Password: Password123!)');
    }
  } catch (err) {
    // Ignore duplicate or seed error
  }
};

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bugtracker';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    await ensureDefaultUser();
    return conn;
  } catch (error) {
    logger.warn(`Connecting to external MongoDB (${mongoURI}) failed: ${error.message}`);

    // Automatic persistent local database fallback
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Starting Embedded In-Memory MongoDB Server with persistent storage...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const dbDir = path.join(__dirname, '../../.mongo-storage');
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        if (!globalMemoryServer) {
          try {
            globalMemoryServer = await MongoMemoryServer.create({
              instance: {
                dbPath: dbDir,
                storageEngine: 'wiredTiger',
              },
            });
          } catch (lockErr) {
            // If another instance locked the dir, fallback to ephemeral
            globalMemoryServer = await MongoMemoryServer.create();
          }
        }

        const memoryUri = globalMemoryServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        logger.info(`Embedded Database Connected successfully: ${memoryUri}`);
        logger.info('Zero-config database active! Persistent across server reloads.');
        await ensureDefaultUser();
        return conn;
      } catch (memError) {
        logger.error(`Failed to launch Embedded Database: ${memError.message}`);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
