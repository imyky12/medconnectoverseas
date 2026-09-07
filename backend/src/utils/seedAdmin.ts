import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.model';
import { env } from '../config/env';

const runSeed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminExists = await Admin.findOne({ email: 'admin@medconnectsoverseas.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('adminpassword123', 10);
      await Admin.create({
        email: 'admin@medconnectsoverseas.com',
        password: hashedPassword,
        fullName: 'Super Admin',
        isActive: true,
        isTwoFactorEnabled: false,
        // The password below is printed to a terminal and lives in this file,
        // so it is a handover password, not a password. The first sign-in is
        // forced to replace it before the dashboard opens.
        mustChangePassword: true,
      });
      console.log('✅ Seeded default Admin account.');
      console.log('Email: admin@medconnectsoverseas.com');
      console.log('Password: adminpassword123  (you will be asked to replace it at first sign-in)');
    } else {
      console.log('ℹ️ Admin account already exists. Skipping seed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
    process.exit(1);
  }
};

runSeed();
