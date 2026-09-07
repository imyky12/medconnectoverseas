import { useRef, useState } from 'react';
import { FileText, Loader2, X, AlertCircle, Check, Upload } from 'lucide-react';
import { uploadAsset, UploadError } from '../../services/upload';

/**
 * The newsletter PDF field.
 *
 * Separate from `ImageUpload` rather than a mode on it: there is no preview to
 * render, the file is not something to look at, and the reassurance a person
 * needs here is different — that the right file uploaded and how big it is.
 *
 * There is deliberately **no "paste a URL instead" escape hatch**, unlike the
 * image fields. The PDF address is the one thing this whole feature exists to
 * keep private, and letting an admin paste an arbitrary link would let a public
 * address in through the back door.
 */

export interface PdfUploadProps {
  value: string;
  onChange: (url: string, meta?: { sizeBytes: number; name: string; publicId: string }) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
}

function prettyBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfUpload({
  value,
  onChange,
  label = 'Newsletter PDF',
  hint,
  disabled = false,
  required = false,
}: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError('');
    setBusy(true);
    setPercent(0);
    try {
      const result = await uploadAsset(file, 'newsletter-file', { asAdmin: true, onProgress: setPercent });
      setFileName(file.name);
      setFileSize(result.bytes);
      // The id travels with the URL: the PDF is not publicly deliverable, so the
      // server signs a short-lived link from this when someone downloads it.
      onChange(result.url, { sizeBytes: result.bytes, name: file.name, publicId: result.publicId });
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'The upload failed. Please try again.');
    } finally {
      setBusy(false);
      // Lets the same file be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label} {required && <span className="text-declined">*</span>}
        </span>
      )}

      {value && !busy ? (
        <div className="flex items-center gap-3 rounded-xl border border-rule bg-paper px-4 py-3.5">
          <span className="shrink-0 rounded-lg bg-declined-wash p-2 text-declined">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">
              {fileName || 'Newsletter PDF'}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {fileSize !== null ? `${prettyBytes(fileSize)} · ` : ''}Uploaded — readers get this only after verifying their email
            </p>
          </div>
          {!disabled && (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md border border-rule px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => { onChange(''); setFileName(''); setFileSize(null); }}
                aria-label="Remove the PDF"
                className="rounded-md border border-rule p-1.5 text-muted transition-colors hover:border-declined hover:text-declined"
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
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files?.[0]); }}
          onClick={() => !busy && !disabled && inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-signal bg-signal-wash' : 'border-rule bg-paper',
            disabled ? 'cursor-default' : 'cursor-pointer hover:border-signal',
          ].join(' ')}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-signal" />
              <p className="mt-2 text-[13px] font-medium text-ink">Uploading… {percent}%</p>
              <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-rule">
                <div className="h-full bg-signal transition-[width]" style={{ width: `${percent}%` }} />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-faint" />
              <p className="mt-2 text-[13px] font-medium text-ink">
                Choose the PDF <span className="font-normal text-muted">or drag it here</span>
              </p>
              <p className="mt-0.5 text-[12px] text-faint">PDF only, up to 40MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
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
      {value && !error && !busy && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-confirmed">
          <Check className="h-3.5 w-3.5" /> PDF attached
        </p>
      )}
    </div>
  );
}
