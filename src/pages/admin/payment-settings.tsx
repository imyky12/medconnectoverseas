import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { api } from '../../services/api';

/**
 * These details are shown to a student at the moment they are about to pay, so
 * the form carries a live preview of exactly what they will see. Getting a
 * digit wrong here means money going to the wrong place.
 */

const EMPTY = {
  upiId: '', upiName: '', qrCodeUrl: '',
  bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '',
  additionalInstructions: '',
};

type Form = typeof EMPTY;

const FIELDS: { key: keyof Form; label: string; hint?: string; placeholder?: string }[] = [
  { key: 'upiId', label: 'UPI ID', placeholder: 'name@bank' },
  { key: 'upiName', label: 'Name on the UPI account', placeholder: 'As it appears when paying' },
  { key: 'qrCodeUrl', label: 'UPI QR image link', hint: 'A public image URL. Students scan this.' },
  { key: 'accountHolderName', label: 'Account holder' },
  { key: 'bankName', label: 'Bank' },
  { key: 'accountNumber', label: 'Account number' },
  { key: 'ifscCode', label: 'IFSC code' },
];

export default function AdminPaymentSettings() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<any>('/admin/payment-settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      })
      .then((res: any) => {
        if (res.success && res.data) {
          setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, res.data[k] ?? ''])) } as Form);
        }
      })
      .catch(() => setError('Could not load the current details.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res: any = await api.put('/admin/payment-settings', form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.message || 'Could not save.');
    } catch (err: any) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Payment details</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Students see these at checkout and pay into them directly. Check every digit — a mistake
          here sends money somewhere else.
        </p>
      </header>

      <form onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <fieldset>
            <legend className="font-display text-[17px] font-600 text-ink">Pay by UPI</legend>
            <p className="mt-1 text-[13px] text-muted">Most students use this.</p>
            <div className="mt-4 space-y-4">
              {FIELDS.slice(0, 3).map((f) => (
                <Field key={f.key} field={f} value={form[f.key]} onChange={set(f.key)} />
              ))}
            </div>
          </fieldset>

          <fieldset className="border-t border-rule pt-6">
            <legend className="font-display text-[17px] font-600 text-ink">Bank transfer</legend>
            <p className="mt-1 text-[13px] text-muted">Shown as an alternative if a student cannot use UPI.</p>
            <div className="mt-4 space-y-4">
              {FIELDS.slice(3).map((f) => (
                <Field key={f.key} field={f} value={form[f.key]} onChange={set(f.key)} />
              ))}
            </div>
          </fieldset>

          <fieldset className="border-t border-rule pt-6">
            <legend className="font-display text-[17px] font-600 text-ink">Anything else</legend>
            <p className="mt-1 text-[13px] text-muted">Optional note shown under the payment details.</p>
            <textarea
              rows={3}
              value={form.additionalInstructions}
              onChange={set('additionalInstructions')}
              placeholder="Add your registration number in the payment note."
              className="mt-4 w-full resize-none rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
            />
          </fieldset>

          <div className="flex items-center gap-4 border-t border-rule pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-signal px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
            {saved && (
              <span className="state state-confirmed inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" strokeWidth={2.25} /> Saved
              </span>
            )}
            {error && <span className="text-[13px] text-declined">{error}</span>}
          </div>
        </div>

        {/* What the student sees */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-[13px] text-muted">What students will see</p>
          <div className="panel overflow-hidden">
            <div className="border-b border-rule-soft px-5 py-4">
              <p className="text-[13px] text-muted">Pay by UPI</p>
              {form.qrCodeUrl ? (
                <img
                  src={form.qrCodeUrl}
                  alt="UPI QR preview"
                  className="mx-auto mt-3 block h-[150px] w-[150px] rounded border border-rule object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="mx-auto mt-3 flex h-[150px] w-[150px] items-center justify-center rounded border border-dashed border-rule text-[12px] text-faint">
                  No QR image
                </div>
              )}
              <p className="tabular mt-3 text-center text-[14px] font-600 text-ink">{form.upiId || 'No UPI ID set'}</p>
              {form.upiName && <p className="mt-0.5 text-center text-[13px] text-muted">{form.upiName}</p>}
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-muted">Bank transfer</p>
              <dl className="mt-2 space-y-1.5">
                {[
                  ['Bank', form.bankName],
                  ['Account', form.accountNumber],
                  ['IFSC', form.ifscCode],
                  ['Name', form.accountHolderName],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-[13px] text-faint">{k}</dt>
                    <dd className={`text-right text-[13px] ${v ? 'tabular text-ink' : 'text-faint'}`}>{v || '—'}</dd>
                  </div>
                ))}
              </dl>
              {form.additionalInstructions && (
                <p className="mt-3 border-t border-rule-soft pt-3 text-[13px] text-muted">
                  {form.additionalInstructions}
                </p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({
  field, value, onChange,
}: {
  field: { key: string; label: string; hint?: string; placeholder?: string };
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label htmlFor={field.key} className="block text-[13px] font-medium text-ink">{field.label}</label>
      {field.hint && <p className="mt-0.5 text-[12px] text-faint">{field.hint}</p>}
      <input
        id={field.key}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        className="mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
      />
    </div>
  );
}
