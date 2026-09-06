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
        isTwoFactorEnabled: false
      });
      console.log('✅ Seeded default Admin account.');
      console.log('Email: admin@medconnectsoverseas.com');
      console.log('Password: adminpassword123');
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
