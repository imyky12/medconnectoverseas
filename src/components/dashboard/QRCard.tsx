import { forwardRef, useEffect, useRef, useState } from 'react';

export type QRTheme = 'navy' | 'emerald' | 'violet' | 'rose' | 'amber';

interface QRCardProps {
  qrImage: string;       // base64 PNG data URL
  userName: string;
  eventTitle: string;
  eventCode: string;
  slotDate?: string;
  slotTime?: string;
  theme?: QRTheme;
}

// Each theme has:
//   bg        — card gradient
//   accent    — bright highlight (divider, dots, badge text)
//   qrColor   — dark enough to scan on white (the QR module colour)
//   text / subtext — body type colours
//   badgeBg / badgeBorder — event-code pill
//   infoBg    — frosted info block
//   glow1/2   — radial glow overlays

const themes: Record<QRTheme, {
  bg: string;
  accent: string;
  qrColor: string;       // replaces black QR modules
  qrColorRgb: [number, number, number];
  text: string;
  subtext: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  infoBg: string;
  glow1: string;
  glow2: string;
}> = {
  navy: {
    bg: 'linear-gradient(150deg, #061f4a 0%, #0d3575 45%, #051526 100%)',
    accent: '#c9a84c',
    qrColor: '#0d3575',
    qrColorRgb: [13, 53, 117],
    text: '#ffffff',
    subtext: 'rgba(255,255,255,0.52)',
    badgeBg: 'rgba(201,168,76,0.13)',
    badgeBorder: 'rgba(201,168,76,0.35)',
    badgeText: '#e6c76a',
    infoBg: 'rgba(255,255,255,0.07)',
    glow1: 'radial-gradient(circle, rgba(13,53,117,0.7) 0%, transparent 70%)',
    glow2: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%)',
  },
  emerald: {
    bg: 'linear-gradient(150deg, #052e1c 0%, #065f46 45%, #021a10 100%)',
    accent: '#34d399',
    qrColor: '#064e3b',
    qrColorRgb: [6, 78, 59],
    text: '#ffffff',
    subtext: 'rgba(255,255,255,0.52)',
    badgeBg: 'rgba(52,211,153,0.13)',
    badgeBorder: 'rgba(52,211,153,0.35)',
    badgeText: '#6ee7b7',
    infoBg: 'rgba(255,255,255,0.07)',
    glow1: 'radial-gradient(circle, rgba(6,95,70,0.7) 0%, transparent 70%)',
    glow2: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
  },
  violet: {
    bg: 'linear-gradient(150deg, #1e0748 0%, #4c1d95 45%, #130530 100%)',
    accent: '#a78bfa',
    qrColor: '#3b0764',
    qrColorRgb: [59, 7, 100],
    text: '#ffffff',
    subtext: 'rgba(255,255,255,0.52)',
    badgeBg: 'rgba(167,139,250,0.13)',
    badgeBorder: 'rgba(167,139,250,0.35)',
    badgeText: '#c4b5fd',
    infoBg: 'rgba(255,255,255,0.07)',
    glow1: 'radial-gradient(circle, rgba(76,29,149,0.7) 0%, transparent 70%)',
    glow2: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
  },
  rose: {
    bg: 'linear-gradient(150deg, #3b0114 0%, #9f1239 45%, #200009 100%)',
    accent: '#fb7185',
    qrColor: '#881337',
    qrColorRgb: [136, 19, 55],
    text: '#ffffff',
    subtext: 'rgba(255,255,255,0.52)',
    badgeBg: 'rgba(251,113,133,0.13)',
    badgeBorder: 'rgba(251,113,133,0.35)',
    badgeText: '#fda4af',
    infoBg: 'rgba(255,255,255,0.07)',
    glow1: 'radial-gradient(circle, rgba(159,18,57,0.7) 0%, transparent 70%)',
    glow2: 'radial-gradient(circle, rgba(251,113,133,0.12) 0%, transparent 70%)',
  },
  amber: {
    bg: 'linear-gradient(150deg, #27140a 0%, #92400e 45%, #160a04 100%)',
    accent: '#fbbf24',
    qrColor: '#78350f',
    qrColorRgb: [120, 53, 15],
    text: '#ffffff',
    subtext: 'rgba(255,255,255,0.52)',
    badgeBg: 'rgba(251,191,36,0.13)',
    badgeBorder: 'rgba(251,191,36,0.35)',
    badgeText: '#fcd34d',
    infoBg: 'rgba(255,255,255,0.07)',
    glow1: 'radial-gradient(circle, rgba(146,64,14,0.7) 0%, transparent 70%)',
    glow2: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
  },
};

// ── Canvas-based QR recolouring hook ─────────────────────────────────────────
// Replaces every dark pixel in the QR with the theme colour.
// The QR is generated at H-level error correction (30% tolerance), so the
// logo overlay in the centre does not break scanning.

function useRecoloredQr(qrImage: string, rgb: [number, number, number]): string {
  const [result, setResult] = useState<string>(qrImage);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!qrImage) return;

    // Reuse or create a single off-screen canvas
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const [tr, tg, tb] = rgb;

      for (let i = 0; i < d.length; i += 4) {
        // Treat pixels whose average brightness < 128 as "module" (dark) pixels
        if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 128) {
          d[i]     = tr;
          d[i + 1] = tg;
          d[i + 2] = tb;
          // alpha unchanged
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setResult(canvas.toDataURL('image/png'));
    };
    img.src = qrImage;
  }, [qrImage, rgb[0], rgb[1], rgb[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

const QRCard = forwardRef<HTMLDivElement, QRCardProps>(
  ({ qrImage, userName, eventTitle, eventCode, slotDate, slotTime, theme = 'navy' }, ref) => {
    const t = themes[theme];
    const recoloredQr = useRecoloredQr(qrImage, t.qrColorRgb);

    return (
      <div
        ref={ref}
        style={{
          width: '420px',
          background: t.bg,
          borderRadius: '24px',
          padding: '28px 28px 24px',
          fontFamily: "'Arial', sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glows */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: t.glow1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: t.glow2, pointerEvents: 'none' }} />

        {/* ── Header: brand name + event code ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div>
            <div style={{ color: t.accent, fontWeight: '800', fontSize: '13px', letterSpacing: '0.5px', lineHeight: 1 }}>
              MedConnects
            </div>
            <div style={{ color: t.subtext, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '2px' }}>
              Overseas
            </div>
          </div>

          <div style={{
            background: t.badgeBg,
            border: `1px solid ${t.badgeBorder}`,
            borderRadius: '20px',
            padding: '5px 13px',
          }}>
            <span style={{ color: t.badgeText, fontSize: '10px', fontWeight: '700', letterSpacing: '1.8px', textTransform: 'uppercase' }}>
              {eventCode}
            </span>
          </div>
        </div>

        {/* ── User name ── */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ color: t.subtext, fontSize: '9.5px', fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '5px' }}>
            Registered Attendee
          </div>
          <div style={{ color: t.text, fontWeight: '800', fontSize: '24px', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
            {userName}
          </div>
        </div>

        {/* Accent divider */}
        <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: t.accent, marginBottom: '18px' }} />

        {/* ── QR frame ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '14px',
          position: 'relative',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          marginBottom: '16px',
        }}>
          {/* Recoloured QR */}
          <img
            src={recoloredQr}
            alt="Attendance QR"
            style={{ width: '100%', display: 'block', borderRadius: '8px' }}
          />

          {/* ── MCO logo centred on QR ── */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '62px',
            height: '62px',
            borderRadius: '13px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 2.5px ${t.qrColor}, 0 0 0 4.5px #ffffff, 0 2px 8px rgba(0,0,0,0.18)`,
            padding: '5px',
          }}>
            <img
              src="/images/logo.png"
              alt="MCO"
              style={{ width: '52px', height: '52px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>

        {/* ── Event info ── */}
        <div style={{
          background: t.infoBg,
          borderRadius: '13px',
          padding: '13px 15px',
          marginBottom: '18px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ color: t.subtext, fontSize: '8.5px', fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '5px' }}>
            Event
          </div>
          <div style={{ color: t.text, fontWeight: '700', fontSize: '13.5px', lineHeight: 1.35, marginBottom: (slotDate || slotTime) ? '8px' : '0' }}>
            {eventTitle}
          </div>
          {(slotDate || slotTime) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {slotDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
                  <span style={{ color: t.subtext, fontSize: '11px', fontWeight: '500' }}>{slotDate}</span>
                </div>
              )}
              {slotTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
                  <span style={{ color: t.subtext, fontSize: '11px', fontWeight: '500' }}>{slotTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: t.subtext, fontSize: '9px', letterSpacing: '0.4px' }}>
            medconnectoverseas.com
          </span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[1, 0.55, 0.25].map((op, i) => (
              <div key={i} style={{ width: i === 0 ? '7px' : '5px', height: i === 0 ? '7px' : '5px', borderRadius: '50%', background: t.accent, opacity: op }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

QRCard.displayName = 'QRCard';
export default QRCard;
