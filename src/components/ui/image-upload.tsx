import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X, AlertCircle, Link2, Check } from 'lucide-react';
import { uploadImage, uploadsEnabled, UploadError, type UploadPurpose } from '../../services/upload';

/**
 * One image field, used everywhere the platform takes a picture.
 *
 * Every one of these used to be a bare `<input type="url">`, which asked the
 * person to go and host the file somewhere first. Admins were pasting links to
 * whatever was to hand, and students were being asked to produce a public URL
 * for a payment screenshot sitting in their camera roll — which is not
 * something most people can do on a phone.
 *
 * The URL box has not been removed, for two reasons: every image already in the
 * database is a URL and must stay editable, and if Cloudinary is not configured
 * this control has to degrade to exactly what was there before rather than
 * leaving the form unusable. So it is a choice, not a replacement — and when
 * uploads are unavailable the choice quietly collapses to the URL box.
 */

export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  purpose: UploadPurpose;
  /** Admin surfaces sign with the admin token and can reach the admin folders. */
  asAdmin?: boolean;
  label?: string;
  hint?: string;
  /** Preview shape — a QR code and a wide banner should not be framed alike. */
  aspect?: 'wide' | 'square';
  disabled?: boolean;
  required?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  purpose,
  asAdmin = false,
  label,
  hint,
  aspect = 'wide',
  disabled = false,
  required = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void uploadsEnabled().then((on) => { if (!cancelled) setEnabled(on); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setBroken(false); }, [value]);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError('');
    setBusy(true);
    setPercent(0);
    try {
      const url = await uploadImage(file, purpose, { asAdmin, onProgress: setPercent });
      onChange(url);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'The upload failed. Please try again.');
    } finally {
      setBusy(false);
      // Clearing lets the same file be picked again after a failure — without
      // this, re-selecting an identical filename fires no change event.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const frame = aspect === 'square' ? 'aspect-square max-w-[220px]' : 'aspect-[16/7]';

  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label} {required && <span className="text-declined">*</span>}
        </span>
      )}

      {value && !broken ? (
        <div className={`relative overflow-hidden rounded-xl border border-rule bg-paper ${frame}`}>
          <img
            src={value}
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
          {!disabled && (
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-ink/80 px-2.5 py-1.5 text-[12px] font-medium text-white backdrop-blur transition-colors hover:bg-ink"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => { onChange(''); setError(''); }}
                aria-label="Remove image"
                className="rounded-lg bg-ink/80 p-1.5 text-white backdrop-blur transition-colors hover:bg-declined"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !busy && !disabled && enabled !== false && inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
            frame,
            dragging ? 'border-signal bg-signal-wash' : 'border-rule bg-paper',
            enabled === false || disabled ? 'cursor-default' : 'cursor-pointer hover:border-signal',
          ].join(' ')}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-signal" />
              <p className="mt-2 text-[13px] font-medium text-ink">Uploading… {percent}%</p>
              <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-rule">
                <div className="h-full bg-signal transition-[width]" style={{ width: `${percent}%` }} />
              </div>
            </>
          ) : broken && value ? (
            <>
              <AlertCircle className="h-5 w-5 text-holding" />
              <p className="mt-2 text-[13px] font-medium text-ink">That image link did not load</p>
              <p className="mt-0.5 text-[12px] text-muted">Upload a new one, or check the address below.</p>
            </>
          ) : enabled === false ? (
            <>
              <Link2 className="h-5 w-5 text-faint" />
              <p className="mt-2 text-[13px] text-muted">Paste an image address below</p>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-faint" />
              <p className="mt-2 text-[13px] font-medium text-ink">
                Choose an image <span className="font-normal text-muted">or drag one here</span>
              </p>
              <p className="mt-0.5 text-[12px] text-faint">PNG, JPG, WEBP or HEIC</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {hint && !error && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium text-declined">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {/* The escape hatch. Always reachable, because existing images are URLs
          and someone editing one needs to see and change the actual address. */}
      {enabled === false || showUrl || (broken && value) ? (
        <div className="mt-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="https://"
            className="h-10 w-full rounded-lg border border-rule bg-surface px-3 text-[13px] text-body outline-none transition-colors placeholder:text-faint focus:border-signal"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-signal"
        >
          <Link2 className="h-3.5 w-3.5" />
          {value ? 'Edit the image address' : 'Paste an image address instead'}
        </button>
      )}

      {value && !broken && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-confirmed">
          <Check className="h-3.5 w-3.5" /> Image set
        </p>
      )}
    </div>
  );
}
