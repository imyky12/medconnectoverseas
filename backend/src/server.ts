import dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { startReminderCron } from './jobs/reminderCron';
import { startEmailWorker } from './jobs/emailWorker';
import { seedPolicies } from './utils/seedPolicies';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Put the legal documents in place if this database has never seen them.
    // A no-op once they exist — the database is the source of truth after the
    // first boot, and re-seeding would discard the admin's edits.
    await seedPolicies();

    // Start background jobs
    startReminderCron();
    startEmailWorker();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
