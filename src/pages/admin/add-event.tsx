import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { api } from '../../services/api';
import { Loader2, ArrowLeft, Plus, Trash2, Bell, FileText } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalSeats: number;
}

interface ReminderEntry {
  id: string;           // local UI key
  type: 'custom' | 'day_of_8am';
  value: number;        // numeric part (ignored for day_of_8am)
  unit: 'minutes' | 'hours' | 'days';
}

function reminderEntryToConfig(r: ReminderEntry): { offsetLabel: string; offsetMinutes: number } {
  if (r.type === 'day_of_8am') {
    return { offsetLabel: 'day_of_8am', offsetMinutes: 0 };
  }
  const multiplier = r.unit === 'minutes' ? 1 : r.unit === 'hours' ? 60 : 1440;
  const offsetMinutes = r.value * multiplier;
  const offsetLabel = `${r.value}_${r.unit}_before`;
  return { offsetLabel, offsetMinutes };
}

function reminderEntryLabel(r: ReminderEntry): string {
  if (r.type === 'day_of_8am') return 'Day of event at 08:00 AM';
  return `${r.value} ${r.unit} before`;
}

let _reminderIdCounter = 0;
function newReminderId() { return `rem-${++_reminderIdCounter}`; }

const DEFAULT_REMINDERS: ReminderEntry[] = [
  { id: newReminderId(), type: 'custom',    value: 3,  unit: 'days'    },
  { id: newReminderId(), type: 'custom',    value: 1,  unit: 'days'    },
  { id: newReminderId(), type: 'day_of_8am', value: 0, unit: 'hours'   },
  { id: newReminderId(), type: 'custom',    value: 10, unit: 'minutes' },
];

const emptySlot = (idx: number): Slot => ({
  slotId: `NEW-S${idx + 1}`,
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  totalSeats: 50,
});

const inputCls = 'w-full h-10 px-3 rounded-lg border border-rule text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition bg-white';
const textareaCls = 'w-full px-3 py-2 rounded-lg border border-rule text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition resize-none bg-white';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAddEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const token = localStorage.getItem('adminToken');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  // Core fields
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Slots
  const [slots, setSlots] = useState<Slot[]>([emptySlot(0)]);

  // Post-event notes
  const [notesUrl, setNotesUrl] = useState('');
  const [notesTitle, setNotesTitle] = useState('');

  // Reminder entries (dynamic)
  const [reminders, setReminders] = useState<ReminderEntry[]>(DEFAULT_REMINDERS);
  // New reminder form fields
  const [newReminderType, setNewReminderType] = useState<'custom' | 'day_of_8am'>('custom');
  const [newReminderValue, setNewReminderValue] = useState(1);
  const [newReminderUnit, setNewReminderUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  // Load existing event for edit mode
  useEffect(() => {
    if (!isEdit) return;
    api.get<any>(`/admin/events/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res: any) => {
        if (!res.success) return;
        const ev = res.data;
        setTitle(ev.title ?? '');
        setShortDescription(ev.shortDescription ?? '');
        setDescription(ev.description ?? '');
        setBannerUrl(ev.bannerUrl ?? '');
        setCategory(ev.category ?? '');
        setPrice(String(ev.price ?? ''));
        setDiscountedPrice(ev.discountedPrice ? String(ev.discountedPrice) : '');
        setMode(ev.mode ?? 'online');
        setLocation(ev.location ?? '');
        setMeetLink(ev.meetLink ?? '');
        setIsPublished(ev.isPublished ?? false);
        setNotesUrl(ev.notesUrl ?? '');
        setNotesTitle(ev.notesTitle ?? '');
        if (ev.slots?.length) {
          setSlots(ev.slots.map((s: any) => ({
            slotId: s.slotId,
            date: s.date ? s.date.split('T')[0] : '',
            startTime: s.startTime,
            endTime: s.endTime,
            totalSeats: s.totalSeats,
          })));
        }
        if (ev.reminderConfigs?.length) {
          setReminders(ev.reminderConfigs.map((r: any): ReminderEntry => {
            if (r.offsetLabel === 'day_of_8am') {
              return { id: newReminderId(), type: 'day_of_8am', value: 0, unit: 'hours' };
            }
            // Infer unit from offsetMinutes
            let value = r.offsetMinutes;
            let unit: 'minutes' | 'hours' | 'days' = 'minutes';
            if (r.offsetMinutes % 1440 === 0 && r.offsetMinutes > 0) {
              value = r.offsetMinutes / 1440;
              unit = 'days';
            } else if (r.offsetMinutes % 60 === 0 && r.offsetMinutes > 0) {
              value = r.offsetMinutes / 60;
              unit = 'hours';
            }
            return { id: newReminderId(), type: 'custom', value, unit };
          }));
        }
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [id]);

  // ─── Slot helpers ───────────────────────────────────────────────────────────

  const addSlot = () => setSlots(prev => [...prev, emptySlot(prev.length)]);

  const removeSlot = (idx: number) => {
    if (slots.length === 1) return;
    setSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: keyof Slot, value: string | number) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addReminder = () => {
    if (newReminderType === 'day_of_8am') {
      if (reminders.some(r => r.type === 'day_of_8am')) return; // already added
      setReminders(prev => [...prev, { id: newReminderId(), type: 'day_of_8am', value: 0, unit: 'hours' }]);
    } else {
      if (!newReminderValue || newReminderValue <= 0) return;
      setReminders(prev => [...prev, { id: newReminderId(), type: 'custom', value: newReminderValue, unit: newReminderUnit }]);
    }
    setNewReminderValue(1);
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'offline' && !location.trim()) {
      alert('Location is required for offline events.');
      return;
    }
    setIsLoading(true);
    try {
      const reminderConfigs = reminders.map(reminderEntryToConfig);

      const payload = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        bannerUrl: bannerUrl.trim(),
        category: category.trim(),
        price: Number(price),
        discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
        mode,
        location: mode === 'offline' ? location.trim() : undefined,
        meetLink: meetLink.trim() || undefined,
        isPublished,
        slots: slots.map(s => ({ ...s, totalSeats: Number(s.totalSeats) })),
        reminderConfigs,
        notesUrl: notesUrl.trim() || undefined,
        notesTitle: notesTitle.trim() || undefined,
      };

      const res: any = isEdit
        ? await api.put(`/admin/events/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } })
        : await api.post('/admin/events', payload, { headers: { Authorization: `Bearer ${token}` } });

      if (res.success) {
        navigate('/admin/events');
      } else {
        alert(res.message || 'Failed to save event.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving event');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-faint" /></div>;
  }

  return (
    <div className="max-w-[720px] space-y-7 pb-16">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/events')} className="p-2 hover:bg-white rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </button>
        <div>
          <h1 className="font-display text-[26px] font-600 leading-tight text-ink">{isEdit ? 'Edit event' : 'New event'}</h1>
          <p className="mt-1 text-[14px] text-muted">{isEdit ? 'Changes to a time slot email everyone already registered.' : 'Save it as a draft first — nothing is visible to students until you publish.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Core Details ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">What the event is</h2>
          </div>
          <CardContent className="p-6 space-y-5 py-6">
            <div>
              <Label>Title <span className="text-declined">*</span></Label>
              <Input required value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 h-11" placeholder="e.g. USMLE Step 1 Workshop" />
            </div>
            <div>
              <Label>Short Description <span className="text-declined">*</span></Label>
              <Input required maxLength={250} value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="mt-1.5 h-11" placeholder="One-line summary (max 250 chars)" />
            </div>
            <div>
              <Label>Full Description <span className="text-declined">*</span></Label>
              <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)} className={`mt-1.5 ${textareaCls}`} placeholder="Detailed description of the event…" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label>Banner Image URL <span className="text-declined">*</span></Label>
                <Input required type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="mt-1.5 h-11" placeholder="https://" />
              </div>
              <div>
                <Label>Category <span className="text-declined">*</span></Label>
                <Input required value={category} onChange={e => setCategory(e.target.value)} className="mt-1.5 h-11" placeholder="e.g. Workshop, Seminar" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Mode & Location ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">Where it happens</h2>
          </div>
          <CardContent className="p-6 space-y-5 py-6">
            <div>
              <Label>Event Mode <span className="text-declined">*</span></Label>
              <div className="flex gap-3 mt-2">
                {(['online', 'offline'] as const).map(m => (
                  <label key={m} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer font-medium text-sm transition-colors ${mode === m ? 'border-ink bg-ink/5 text-ink' : 'border-rule text-muted hover:border-rule'}`}>
                    <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                    {m === 'online' ? 'Online' : 'Offline'}
                  </label>
                ))}
              </div>
            </div>
            {mode === 'offline' && (
              <div>
                <Label>Venue / Location <span className="text-declined">*</span></Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} className="mt-1.5 h-11" placeholder="e.g. AIIMS New Delhi, Auditorium Block C" />
              </div>
            )}
            <div>
              <Label>Meet Link <span className="text-faint font-normal">(students see this only once their place is confirmed)</span></Label>
              <Input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="mt-1.5 h-11" placeholder="https://meet.google.com/…" />
            </div>
          </CardContent>
        </Card>

        {/* ── Slots ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">When it runs</h2>
            <button type="button" onClick={addSlot} className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:bg-ink/5 px-3 py-1.5 rounded-lg transition-colors border border-ink/20">
              <Plus className="h-3.5 w-3.5" /> Add Slot
            </button>
          </div>
          <CardContent className="p-6 space-y-4 py-6">
            {slots.map((slot, idx) => (
              <div key={idx} className="p-4 border border-rule rounded-lg bg-paper/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted ">Slot {idx + 1}</span>
                  {slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)} className="text-declined hover:bg-declined-wash p-1 rounded transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted mb-1">Date <span className="text-declined">*</span></label>
                    <input type="date" required value={slot.date} onChange={e => updateSlot(idx, 'date', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Start <span className="text-declined">*</span></label>
                    <input type="time" required value={slot.startTime} onChange={e => updateSlot(idx, 'startTime', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">End <span className="text-declined">*</span></label>
                    <input type="time" required value={slot.endTime} onChange={e => updateSlot(idx, 'endTime', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-muted mb-1">Total Seats <span className="text-declined">*</span></label>
                  <input type="number" required min="1" value={slot.totalSeats} onChange={e => updateSlot(idx, 'totalSeats', Number(e.target.value))} className={inputCls} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Pricing ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">What it costs</h2>
          </div>
          <CardContent className="p-6 space-y-5 py-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label>Price (₹) <span className="text-declined">*</span></Label>
                <Input required type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="mt-1.5 h-11 font-mono" placeholder="1999" />
              </div>
              <div>
                <Label>Discounted Price (₹) <span className="text-faint font-normal">(optional)</span></Label>
                <Input type="number" min="0" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)} className="mt-1.5 h-11 font-mono" placeholder="1499" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Reminders ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">Reminders we send</h2>
          </div>
          <CardContent className="p-6 space-y-5 py-6">
            <p className="text-xs text-muted">
              Add reminders to send to registered attendees via email and WhatsApp. You can set any custom time.
            </p>

            {/* Existing reminders */}
            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-ink/5 border border-ink/20 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <Bell className="h-3.5 w-3.5 text-ink shrink-0" />
                      <span className="text-sm font-medium text-ink">{reminderEntryLabel(r)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReminder(r.id)}
                      className="text-faint hover:text-declined transition-colors p-1 rounded hover:bg-declined-wash"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-faint italic">No reminders added. Attendees won't receive notifications.</p>
            )}

            {/* Add reminder form */}
            <div className="border border-rule rounded-lg p-4 space-y-3 bg-paper/50">
              <p className="text-xs font-semibold text-muted">Add a reminder</p>

              {/* Type selector */}
              <div className="flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 cursor-pointer text-xs font-medium transition-colors ${newReminderType === 'custom' ? 'border-ink bg-ink/5 text-ink' : 'border-rule text-muted hover:border-rule'}`}>
                  <input type="radio" className="sr-only" checked={newReminderType === 'custom'} onChange={() => setNewReminderType('custom')} />
                  Custom time before
                </label>
                <label className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 cursor-pointer text-xs font-medium transition-colors ${newReminderType === 'day_of_8am' ? 'border-ink bg-ink/5 text-ink' : 'border-rule text-muted hover:border-rule'}`}>
                  <input type="radio" className="sr-only" checked={newReminderType === 'day_of_8am'} onChange={() => setNewReminderType('day_of_8am')} />
                  Day of at 08:00 AM
                </label>
              </div>

              {/* Custom value + unit */}
              {newReminderType === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={newReminderValue}
                    onChange={e => setNewReminderValue(Math.max(1, Number(e.target.value)))}
                    className={`${inputCls} w-24 shrink-0`}
                    placeholder="e.g. 2"
                  />
                  <select
                    value={newReminderUnit}
                    onChange={e => setNewReminderUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={addReminder}
                disabled={newReminderType === 'day_of_8am' && reminders.some(r => r.type === 'day_of_8am')}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors border border-ink/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add Reminder
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Post-Event Assets ── */}
        <Card className="panel gap-0 border-0 py-0 shadow-none">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">
              <FileText className="h-4 w-4 text-muted" /> Notes and materials
            </h2>
          </div>
          <CardContent className="p-6 space-y-5 py-6">
            <p className="text-xs text-muted">
              After the event, add a notes link (e.g. Google Drive, Notion). All attendees who have attendance recorded will be able to access it.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label>Notes URL <span className="text-faint font-normal">(optional)</span></Label>
                <Input type="url" value={notesUrl} onChange={e => setNotesUrl(e.target.value)} className="mt-1.5 h-11" placeholder="https://drive.google.com/…" />
              </div>
              <div>
                <Label>Notes Label <span className="text-faint font-normal">(shown to users)</span></Label>
                <Input value={notesTitle} onChange={e => setNotesTitle(e.target.value)} className="mt-1.5 h-11" placeholder="e.g. Workshop Slides & Recording" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Publish toggle ── */}
        <div className="flex items-center gap-3 bg-white border border-rule rounded-lg px-5 py-4">
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={e => setIsPublished(e.target.checked)}
            className="h-5 w-5 accent-ink"
          />
          <label htmlFor="isPublished" className="text-sm font-semibold text-body cursor-pointer">
            Publish now — students can see and register straight away
          </label>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full bg-ink hover:bg-ink text-white h-14 rounded-lg text-base font-bold">
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : isEdit ? 'Save Changes' : 'Create Event'}
        </Button>
      </form>
    </div>
  );
}
