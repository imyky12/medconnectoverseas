import { forwardRef } from 'react';

interface CertificateTemplateProps {
  userName: string;
  eventTitle: string;
  eventCode: string;
  slotDate: string;   // formatted date string e.g. "15 June 2025"
}

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ userName, eventTitle, eventCode, slotDate }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '1122px',
          height: '794px',
          background: '#ffffff',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top band */}
        <div style={{ background: '#041c44', height: '12px', width: '100%' }} />

        {/* Left accent bar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: '12px',
          bottom: '12px',
          width: '8px',
          background: '#c9a84c',
        }} />

        {/* Right accent bar */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: '12px',
          bottom: '12px',
          width: '8px',
          background: '#c9a84c',
        }} />

        {/* Bottom band */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#041c44', height: '12px' }} />

        {/* Body content */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '8px',
          right: '8px',
          bottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 80px',
          gap: '0',
        }}>
          {/* Organisation name */}
          <div style={{ color: '#041c44', fontSize: '13px', fontFamily: 'Arial, sans-serif', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '6px' }}>
            MedConnect Overseas
          </div>

          {/* Certificate heading */}
          <div style={{ color: '#c9a84c', fontSize: '38px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '4px' }}>
            Certificate of Attendance
          </div>

          {/* Thin divider */}
          <div style={{ width: '220px', height: '2px', background: '#c9a84c', marginBottom: '32px', marginTop: '8px' }} />

          {/* Body text */}
          <div style={{ color: '#374151', fontSize: '15px', fontFamily: 'Arial, sans-serif', marginBottom: '10px' }}>
            This is to certify that
          </div>

          {/* Recipient name */}
          <div style={{
            color: '#041c44',
            fontSize: '42px',
            fontWeight: 'bold',
            marginBottom: '16px',
            textAlign: 'center',
            lineHeight: '1.2',
          }}>
            {userName}
          </div>

          <div style={{ color: '#374151', fontSize: '15px', fontFamily: 'Arial, sans-serif', marginBottom: '8px', textAlign: 'center' }}>
            successfully attended
          </div>

          {/* Event title */}
          <div style={{
            color: '#041c44',
            fontSize: '22px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '8px',
            maxWidth: '700px',
            lineHeight: '1.3',
          }}>
            {eventTitle}
          </div>

          {/* Date */}
          <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'Arial, sans-serif', marginBottom: '32px' }}>
            held on {slotDate}
          </div>

          {/* Signature + code row */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1.5px solid #9ca3af', width: '160px', marginBottom: '4px' }} />
              <div style={{ color: '#6b7280', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>Authorised Signatory</div>
              <div style={{ color: '#374151', fontSize: '12px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>MedConnect Overseas</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {eventCode}
              </div>
              <div style={{ color: '#c9a84c', fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
                medconnectoverseas.com
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
export default CertificateTemplate;
