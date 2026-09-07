import { Router } from 'express';
import {
  getMarketplaceCourses,
  getCourseByCode,
  getMyCourses,
  validateCoupon,
} from '../../controllers/user/course.controller';
import { auth } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/marketplace', getMarketplaceCourses);
router.get('/detail/:courseCode', getCourseByCode);

// Protected routes
router.use(auth);
router.get('/my-courses', getMyCourses);
router.post('/validate-coupon', validateCoupon);

export default router;
