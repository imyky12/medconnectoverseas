import { useEffect, useRef } from 'react';

/**
 * A six-box code entry.
 *
 * One wide text field centred its digits inside a box that was itself padded
 * for a leading icon, so the code never sat where it looked like it should —
 * and browsers hang their own password-manager glyph off the right edge, which
 * pushed it further out. Six fixed boxes have nothing to centre against: each
 * digit has exactly one place to be.
 *
 * The boxes are separate inputs so phones give each one the numeric keypad and
 * so SMS autofill has somewhere to land, but they behave as a single field —
 * typing advances, backspace retreats, arrows move, and pasting a whole code
 * into any box fills all six.
 */

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires when all six digits are present, so the form can submit itself. */
  onComplete?: () => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  /** Announced to screen readers as the group's name. */
  label?: string;
}

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
  invalid = false,
  label = 'Verification code',
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.();
  };

  const focusBox = (i: number) => {
    const box = inputs.current[Math.max(0, Math.min(length - 1, i))];
    box?.focus();
    box?.select();
  };

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    // Typing over a filled box replaces that digit; a multi-digit burst (some
    // Android keyboards deliver an autofilled code this way) fills forward.
    const chars = value.split('');
    for (let k = 0; k < typed.length && i + k < length; k += 1) chars[i + k] = typed[k];
    const next = chars.join('').replace(/\s/g, '').slice(0, length);

    commit(next);
    focusBox(i + typed.length);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = value.split('');
      if (chars[i]) {
        // Clear this box and stay put — the usual "undo what I just typed".
        chars[i] = '';
        commit(chars.join(''));
      } else {
        // Already empty: step back and clear that one instead.
        chars[i - 1] = '';
        commit(chars.join(''));
        focusBox(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusBox(pasted.length);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center justify-center gap-2 sm:gap-2.5"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          value={digits[i]?.trim() ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          maxLength={1}
          className={[
            'h-14 w-11 rounded-xl border text-center text-[22px] font-600 tabular',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 sm:w-12',
            invalid
              ? 'border-red-300 text-red-700 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 text-gray-900 focus:border-[#041c44] focus:ring-[#041c44]/25',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
