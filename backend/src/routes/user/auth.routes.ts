import { Router } from 'express';
import { requestOtp, verifyEmailOtp, getMe } from '../../controllers/user/auth.controller';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter';
import { auth } from '../../middleware/auth';

const router = Router();

// POST /api/v1/auth/request-otp
router.post('/request-otp', otpLimiter, requestOtp);

// POST /api/v1/auth/verify-otp 
router.post('/verify-otp', authLimiter, verifyEmailOtp);

// GET /api/v1/auth/me — is the caller's stored session still valid?
router.get('/me', auth, getMe);

export default router;
