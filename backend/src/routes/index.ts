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

// ─── Public forms ──────────────────────────────────────
// Rate-limited: both are unauthenticated and would otherwise be an open relay
// into the team's inbox.
import { submitEnquiry, subscribeToNewsletter } from '../controllers/public.controller';
import { apiLimiter } from '../middleware/rateLimiter';
router.post('/contact', apiLimiter, submitEnquiry);

// ─── Newsletter (public) ───────────────────────────────
// List and detail carry metadata only — never the PDF address. Getting the file
// takes an emailed code; see newsletter.controller.
import {
  listPublishedNewsletters, getPublishedNewsletter,
  requestNewsletterAccess, verifyNewsletterAccess, downloadNewsletter,
} from '../controllers/newsletter.controller';
router.get('/newsletters', listPublishedNewsletters);
router.get('/newsletters/:id', getPublishedNewsletter);
router.post('/newsletters/:id/request-access', apiLimiter, requestNewsletterAccess);
router.post('/newsletters/:id/verify-access', apiLimiter, verifyNewsletterAccess);
router.get('/newsletters/:id/download', downloadNewsletter);

// Public read of the live legal documents. Drafts are never reachable here.
import { getPublishedPolicy } from '../controllers/public.controller';
router.get('/policies/:slug', getPublishedPolicy);
router.post('/newsletter/subscribe', apiLimiter, subscribeToNewsletter);

// ─── Uploads ───────────────────────────────────────────
// Two entry points on purpose. `audience` comes from the route, not the
// request, so a student token can only ever sign a payment screenshot — the
// admin folders are unreachable from here. The admin twin lives in routes/admin.
import { createUploadSignature, getUploadConfig } from '../controllers/upload.controller';
router.get('/uploads/config', getUploadConfig);
router.post('/uploads/signature', auth, createUploadSignature('user'));

import adminRoutes from './admin/index';

// ─── Admin Routes ──────────────────────────────────────
router.use('/admin', adminRoutes);

export default router;
