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

// Admin-side upload signing. Everything below `router.use(adminAuth)` already
// requires an admin token, so passing 'admin' here is safe: the folders in
// UPLOAD_TARGETS marked admin are reachable only through this route.
import { createUploadSignature } from '../../controllers/upload.controller';
router.post('/uploads/signature', createUploadSignature('admin'));

// ─── Legal documents ───────────────────────────────────
import {
  listPolicies, getPolicy, savePolicyDraft, publishPolicy,
  getPolicyVersion, restorePolicyVersion,
} from '../../controllers/admin/policy.controller';
router.get('/policies', listPolicies);
router.get('/policies/:slug', getPolicy);
router.put('/policies/:slug/draft', savePolicyDraft);
router.post('/policies/:slug/publish', publishPolicy);
router.get('/policies/:slug/versions/:version', getPolicyVersion);
router.post('/policies/:slug/versions/:version/restore', restorePolicyVersion);

// ─── Newsletter ────────────────────────────────────────
import {
  listAllNewsletters, createNewsletter, updateNewsletter, deleteNewsletter, notifySubscribers,
} from '../../controllers/newsletter.controller';
router.get('/newsletters', listAllNewsletters);
router.post('/newsletters', createNewsletter);
router.put('/newsletters/:id', updateNewsletter);
router.delete('/newsletters/:id', deleteNewsletter);
router.post('/newsletters/:id/notify', notifySubscribers);

// ─── Activity log ──────────────────────────────────────
import { listActivity, listActivityActions } from '../../controllers/admin/activity.controller';
router.get('/activity', listActivity);
router.get('/activity/actions', listActivityActions);

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
