import { Router } from 'express';
import {
  adminLogin,
  adminVerifyOtp,
  adminResendOtp,
  adminSetPassword,
} from '../../controllers/admin/auth.controller';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Signing in takes two steps: the password, then a code emailed to the
// account's own address. Only step two hands back an access token.
//
// POST /api/v1/admin/auth/login         — step 1: the password
router.post('/login', authLimiter, adminLogin);
// POST /api/v1/admin/auth/verify-otp    — step 2: the emailed code
router.post('/verify-otp', authLimiter, adminVerifyOtp);
// POST /api/v1/admin/auth/resend-otp    — a fresh code for a challenge in progress
router.post('/resend-otp', otpLimiter, adminResendOtp);
// POST /api/v1/admin/auth/set-password  — first sign-in on a handed-over password
router.post('/set-password', authLimiter, adminSetPassword);

export default router;
