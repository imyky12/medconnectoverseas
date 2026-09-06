import { Router } from 'express';
import userAuthRoutes from './user/auth.routes';
import userProfileRoutes from './user/profile.routes';
import userCourseRoutes from './user/course.routes';
import userReferralRoutes from './user/referral.routes';
import userOrderRoutes from './user/order.routes';
import userEventRoutes from './user/event.routes';
import { auth } from '../middleware/auth';

const router = Router();

// ─── User Routes ───────────────────────────────────────
router.use('/auth', userAuthRoutes);
router.use('/profile', auth, userProfileRoutes);
router.use('/courses', userCourseRoutes);         // Some routes public, some protected
router.use('/referrals', auth, userReferralRoutes);
router.use('/orders', auth, userOrderRoutes);
router.use('/events', userEventRoutes);           // Some routes public, some protected

import { getPaymentSettings } from '../controllers/admin/payment.controller';
router.get('/payment-settings', getPaymentSettings);

import adminRoutes from './admin/index';

// ─── Admin Routes ──────────────────────────────────────
router.use('/admin', adminRoutes);

export default router;
