import { Router } from 'express';
import { getReferralInfo, validateReferralCode } from '../../controllers/user/referral.controller';

const router = Router();

// GET /api/v1/referrals — Get referral code and stats for the logged-in user
router.get('/', getReferralInfo);

// GET /api/v1/referrals/validate/:code — is this code real, and whose is it?
router.get('/validate/:code', validateReferralCode);

export default router;
