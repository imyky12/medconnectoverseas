import { Router } from 'express';
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../../controllers/admin/course.controller';

const router = Router();

router.get('/', getAllCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
