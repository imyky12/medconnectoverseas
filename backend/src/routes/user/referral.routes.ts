import { Router } from 'express';
import { getReferralInfo } from '../../controllers/user/referral.controller';

const router = Router();

// GET /api/v1/referrals — Get referral code and stats for the logged-in user
router.get('/', getReferralInfo);

export default router;
