import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { EventRegistration } from '../../models/EventRegistration.model';
import { Event } from '../../models/Event.model';
import { notifyAttendanceMarked } from '../../services/email/notifications';

// ─── Get all registrations for an event ──────────────────────────────────────

export const getEventRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { status } = req.query;

  const filter: Record<string, any> = { event: eventId };
  if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
    filter.status = status;
  }

  const registrations = await EventRegistration.find(filter)
    .populate('user', 'firstName lastName email mobile country')
    .populate('order', 'finalPrice transactionId screenshotUrl coupon status rejectionReason createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, registrations, 'Registrations fetched'));
});

// ─── QR attendance scan ───────────────────────────────────────────────────────

export const scanAttendance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { qrToken } = req.body;

  if (!qrToken?.trim()) {
    throw new ApiError(400, 'qrToken is required');
  }

  const registration = await EventRegistration.findOne({ qrToken })
    .populate('user', 'firstName lastName email mobile')
    .populate('event', 'title eventCode slots notesUrl');

  if (!registration) throw new ApiError(404, 'Invalid QR code — registration not found');

  if (registration.status !== 'approved') {
    throw new ApiError(400, `Cannot mark attendance — registration is ${registration.status}`);
  }

  if (registration.attended) {
    res.status(200).json(
      new ApiResponse(200, { registration, alreadyMarked: true }, 'Attendance already recorded')
    );
    return;
  }

  registration.attended = true;
  await registration.save();

  // Certificate-ready email. Guarded by a dedupeKey on the registration, so a
  // re-scan can never send it twice.
  const attendee = registration.user as unknown as { _id: unknown; firstName?: string; lastName?: string; email?: string };
  const scanned = registration.event as unknown as { _id: unknown; title: string; eventCode: string; notesUrl?: string };
  if (attendee?.email) {
    void notifyAttendanceMarked(attendee as any, scanned as any, registration.id);
  }

  res.status(200).json(
    new ApiResponse(200, { registration, alreadyMarked: false }, 'Attendance marked successfully')
  );
});

// ─── Download attendees as Excel ──────────────────────────────────────────────

export const downloadAttendeesExcel = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).lean();
  if (!event) throw new ApiError(404, 'Event not found');

  const registrations = await EventRegistration.find({ event: eventId })
    .populate<{ user: any }>('user', 'firstName lastName email mobile country')
    .populate<{ order: any }>('order', 'finalPrice transactionId status')
    .lean();

  // Build slot lookup: slotId → { date, time }
  const slotMap = new Map(
    event.slots.map((s) => [
      s.slotId,
      {
        date: new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: `${s.startTime}–${s.endTime}`,
      },
    ])
  );

  const rows = registrations.map((r) => {
    const slot = slotMap.get(r.slotId);
    return {
      'Name':           `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || '—',
      'Email':          r.user?.email ?? '',
      'Mobile':         r.user?.mobile ?? '',
      'Country':        r.user?.country ?? '',
      'Slot Date':      slot?.date ?? r.slotId,
      'Slot Time':      slot?.time ?? '',
      'Status':         r.order?.status ?? r.status,
      'Attended':       r.attended ? 'Yes' : 'No',
      'Transaction ID': r.order?.transactionId ?? '',
      'Final Price':    r.order?.finalPrice ?? '',
      'QR Token':       r.qrToken ?? '',
      'Registered At':  new Date(r.createdAt).toLocaleString('en-IN'),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_registrations.xlsx"`);
  res.send(buf);
});

