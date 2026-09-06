import { Router } from 'express';
import { getMyOrders, createOrder } from '../../controllers/user/order.controller';
import { auth } from '../../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', getMyOrders);
router.post('/', createOrder);

export default router;
