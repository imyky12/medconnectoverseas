import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2, Check } from 'lucide-react';
import QRCard from './QRCard';
import type { QRTheme } from './QRCard';

/**
 * Your entry pass — one component, used everywhere the pass appears.
 *
 * The card itself is a fixed 420px artwork. Rather than shrinking it with a
 * fixed transform and clawing the space back with a negative margin, the
 * wrapper measures itself and scales the card to fit, reserving exactly the
 * height it ends up occupying. So it fills a phone screen and sits at full
 * size on a desktop, with no guessing.
 */

const CARD_WIDTH = 420;

const THEMES: { key: QRTheme; label: string; swatch: string }[] = [
  { key: 'navy', label: 'Navy', swatch: '#0d3575' },
  { key: 'emerald', label: 'Green', swatch: '#065f46' },
  { key: 'violet', label: 'Violet', swatch: '#4c1d95' },
  { key: 'rose', label: 'Rose', swatch: '#9f1239' },
  { key: 'amber', label: 'Amber', swatch: '#92400e' },
];

export interface EventPassProps {
  qrImage?: string;
  userName: string;
  eventTitle: string;
  eventCode: string;
  slotDate?: string;
  slotTime?: string;
}

export default function EventPass({
  qrImage, userName, eventTitle, eventCode, slotDate, slotTime,
}: EventPassProps) {
  const [theme, setTheme] = useState<QRTheme>('navy');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scale, setScale] = useState(1);
  const [cardHeight, setCardHeight] = useState(0);

  const exportRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const card = previewRef.current;
    const controls = controlsRef.current;
    if (!wrap || !card) return;

    const natural = card.offsetHeight;
    setCardHeight(natural);

    // Fit by width AND by the height actually left on screen, otherwise the
    // colour picker and save button end up below the fold — which is where
    // they were hiding before.
    // Fit the space left after the controls, but never let the card eat more
    // than half the screen — it is a preview, not the whole page.
    const chrome = (controls?.offsetHeight ?? 180) + 120;
    const room = Math.max(200, Math.min(window.innerHeight - chrome, window.innerHeight * 0.5));
    setScale(Math.min(1, wrap.clientWidth / CARD_WIDTH, natural ? room / natural : 1));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (previewRef.current) ro.observe(previewRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure, qrImage, theme]);

  if (!qrImage) {
    return (
      <div className="rounded-xl border border-rule bg-paper px-6 py-12 text-center">
        <p className="text-[16px] font-600 text-ink">Your pass is not ready yet</p>
        <p className="mx-auto mt-2 max-w-[36ch] text-[14px] leading-relaxed text-muted">
          It appears here the moment we have checked your payment. We will email it to you as well,
          so you do not need to keep this page open.
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!exportRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 3 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${eventCode}-pass.png`;
      a.click();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const cardProps = { qrImage, userName, eventTitle, eventCode, slotDate, slotTime, theme };

  return (
    <div className="w-full">
      {/* Full-resolution copy, off-screen, used for the download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }} aria-hidden>
        <QRCard ref={exportRef} {...cardProps} />
      </div>

      {/* Preview, scaled to whatever room it has.
          wrapRef stays full-width so measuring it is never circular; the box
          inside takes the card's *scaled* footprint, so `mx-auto` actually
          centres what you see rather than the 420px the card would have
          occupied unscaled. */}
      <div ref={wrapRef} className="w-full">
        <div
          className="mx-auto"
          style={{ width: CARD_WIDTH * scale, height: cardHeight ? cardHeight * scale : undefined }}
        >
          <div
            ref={previewRef}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_WIDTH }}
            className="pointer-events-none"
          >
            <QRCard {...cardProps} />
          </div>
        </div>
      </div>

      <div ref={controlsRef}>
      <fieldset className="mt-6">
        <legend className="sr-only">Pass colour</legend>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="mr-1 text-[14px] text-muted">Colour</span>
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                aria-pressed={active}
                aria-label={t.label}
                title={t.label}
                className={[
                  'h-9 w-9 rounded-full transition-all',
                  active
                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
                    : 'opacity-65 hover:opacity-100',
                ].join(' ')}
                style={{ backgroundColor: t.swatch }}
              />
            );
          })}
        </div>
      </fieldset>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          : saved ? <Check className="h-4 w-4" strokeWidth={2.25} />
          : <Download className="h-4 w-4" strokeWidth={1.75} />}
        {saving ? 'Saving…' : saved ? 'Saved to your device' : 'Save my pass'}
      </button>

      <p className="mt-2.5 text-center text-[14px] leading-relaxed text-muted">
        Save it now so you can get in even if the venue has no signal.
      </p>
      </div>
    </div>
  );
}
