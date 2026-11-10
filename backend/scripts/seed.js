/**
 * Database Seed Script
 * Pre-populates MongoDB with realistic users and bugs across different severities and statuses.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Bug = require('../src/models/Bug');
const logger = require('../src/config/logger');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bugtracker';

async function seedDatabase() {
  try {
    await mongoose.connect(mongoURI);
    logger.info(`Connected to MongoDB for seeding: ${mongoURI}`);

    // Optional: Clean existing data
    await User.deleteMany({ email: { $in: ['nikhil@company.com', 'evaluator@elovient.com'] } });
    logger.info('Cleaned existing demo records.');

    // 1. Create Demo Users
    const user1 = await User.create({
      name: 'Nikhil (Developer)',
      email: 'nikhil@company.com',
      password: 'Password123!',
    });

    const user2 = await User.create({
      name: 'Elovient Evaluator',
      email: 'evaluator@elovient.com',
      password: 'Password123!',
    });

    logger.info(`Created demo users:\n  - ${user1.email}\n  - ${user2.email}`);

    // 2. Create Bugs for User 1
    const bugsUser1 = [
      {
        userId: user1._id,
        title: 'Checkout button unresponsive on iOS Safari',
        description: 'Steps to reproduce:\n1. Open storefront on iPhone Safari (iOS 17.4).\n2. Add item to cart and navigate to checkout.\n3. Tap "Complete Purchase".\nExpected: Stripe payment sheet loads.\nActual: Loading spinner hangs indefinitely due to unhandled WebKit touch event.',
        severity: 'high',
        status: 'open',
        imageKey: 'bugs/demo/safari_checkout_error.png',
      },
      {
        userId: user1._id,
        title: 'Data export to CSV triggers 504 gateway timeout on large datasets',
        description: 'When an organization with >25,000 records initiates a CSV export, synchronous node buffer building blocks the event loop and ALB terminates the connection at 30 seconds.\nFix: Shift to BullMQ async background worker with pre-signed S3 download link.',
        severity: 'high',
        status: 'in-progress',
        imageKey: 'bugs/demo/timeout_stacktrace.png',
      },
      {
        userId: user1._id,
        title: 'Profile avatar upload fails silently when image exceeds 5MB',
        description: 'Frontend should display explicit toast alert when an image greater than 5MB is selected instead of waiting for S3 pre-signed upload rejection.',
        severity: 'med',
        status: 'open',
        imageKey: null,
      },
      {
        userId: user1._id,
        title: 'Dark mode toggle flickers white before applying slate theme',
        description: 'On initial page load, flash of unstyled content (FOUC) occurs in localStorage theme hydration. Need to move theme check script to <head>.',
        severity: 'low',
        status: 'in-progress',
        imageKey: null,
      },
      {
        userId: user1._id,
        title: 'Typo in password reset email template footer',
        description: 'Footer says "Elovient Solution" instead of "Elovient Software Solutions". Fixed in email template string.',
        severity: 'low',
        status: 'closed',
        imageKey: null,
      },
    ];

    await Bug.insertMany(bugsUser1);

    // 3. Create Bugs for User 2 (to demonstrate ownership isolation in demo)
    const bugsUser2 = [
      {
        userId: user2._id,
        title: 'Evaluator Private Security Audit Log',
        description: 'This issue belongs exclusively to evaluator@elovient.com and must never be visible to nikhil@company.com.',
        severity: 'high',
        status: 'open',
        imageKey: null,
      },
    ];

    await Bug.insertMany(bugsUser2);

    logger.info(`Successfully seeded 5 bugs for User 1 and 1 bug for User 2.`);
    console.log('\n=== SEED COMPLETE ===');
    console.log('You can now log in with:');
    console.log('  Email:    nikhil@company.com');
    console.log('  Password: Password123!\n');
    console.log('Or test ownership isolation with:');
    console.log('  Email:    evaluator@elovient.com');
    console.log('  Password: Password123!\n');

    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  }
}

seedDatabase();

