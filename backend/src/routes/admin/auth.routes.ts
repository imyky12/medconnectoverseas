import { Router } from 'express';
import { adminLogin } from '../../controllers/admin/auth.controller';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/admin/auth/login     — Admin login
router.post('/login', authLimiter, adminLogin);

export default router;
