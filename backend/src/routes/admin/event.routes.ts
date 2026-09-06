import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../../controllers/admin/event.controller';
import {
  getEventRegistrations,
  scanAttendance,
  downloadAttendeesExcel,
} from '../../controllers/admin/eventRegistration.controller';

const router = Router();

// ─── Event CRUD ───────────────────────────────────────────────────────────────
router.get('/',        getAllEvents);
router.post('/',       createEvent);
router.get('/:id',     getEventById);
router.put('/:id',     updateEvent);
router.delete('/:id',  deleteEvent);

// ─── Registrations for a specific event ──────────────────────────────────────
router.get('/:eventId/registrations',          getEventRegistrations);
router.get('/:eventId/registrations/download', downloadAttendeesExcel);

// ─── QR attendance scan ───────────────────────────────────────────────────────
router.post('/attendance/scan', scanAttendance);

export default router;
