import dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { startReminderCron } from './jobs/reminderCron';
import { startEmailWorker } from './jobs/emailWorker';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

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
