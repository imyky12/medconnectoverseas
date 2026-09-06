import { Router } from 'express';
import { requestMobileOtp, onboarding } from '../../controllers/user/profile.controller';
import { otpLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/profile/request-mobile-otp
router.post('/request-mobile-otp', otpLimiter, requestMobileOtp);

// POST /api/v1/profile/onboarding
router.post('/onboarding', onboarding);

export default router;
