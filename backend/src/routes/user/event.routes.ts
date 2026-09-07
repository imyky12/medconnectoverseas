import { Router } from "express";
import {
  getPublishedEvents,
  getEventDetail,
  validateEventCoupon,
  registerForEvent,
  getMyEventRegistrations,
  recordDownload,
} from "../../controllers/user/event.controller";
import { auth } from "../../middleware/auth";
import { optionalAuth } from "../../middleware/optionalAuth";

const router = Router();

// ─── Public routes (optionalAuth — work for guests too) ───────────────────────
// NOTE: /my-registrations and /:eventCode are both GET — /my-registrations must
// be declared BEFORE /:eventCode so Express matches it first.
router.get("/", optionalAuth, getPublishedEvents);
router.get("/my-registrations", auth, getMyEventRegistrations);
router.get("/:eventCode", optionalAuth, getEventDetail);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.post("/validate-coupon", auth, validateEventCoupon);
router.post("/register", auth, registerForEvent);
router.post("/:eventCode/record-download", auth, recordDownload);

export default router;
