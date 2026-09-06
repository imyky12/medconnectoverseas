import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import { getDashboardStats } from '../../controllers/admin/dashboard.controller';
import { getAllOrders, updateOrderStatus } from '../../controllers/admin/order.controller';
import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../../controllers/admin/course.controller';
import { getAllUsers, toggleUserStatus } from '../../controllers/admin/user.controller';
import { getAllCoupons, createCoupon, deleteCoupon } from '../../controllers/admin/coupon.controller';
import { getPaymentSettings, upsertPaymentSettings } from '../../controllers/admin/payment.controller';
import {
  getEmailLogs,
  getEmailLogById,
  previewEmailLog,
  resendEmail,
  getEmailStats,
} from '../../controllers/admin/emailLog.controller';

const router = Router();

// Completely Open Admin Auth Route
router.use('/auth', authRoutes);

// Protected Admin Routes
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Courses
router.get('/courses', getAllCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Coupons
router.get('/coupons', getAllCoupons);
router.post('/coupons', createCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Orders
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// Payment Settings
router.get('/payment-settings', getPaymentSettings);
router.put('/payment-settings', upsertPaymentSettings);

// Email audit log
router.get('/emails', getEmailLogs);
router.get('/emails/stats', getEmailStats);
router.get('/emails/:id', getEmailLogById);
router.get('/emails/:id/preview', previewEmailLog);
router.post('/emails/:id/resend', resendEmail);

// Events (CRUD + registrations + attendance)
router.use('/events', eventRoutes);

export default router;
