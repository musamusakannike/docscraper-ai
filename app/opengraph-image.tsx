import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DocScraper — Context Builder for Coding Agents'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0a1628 60%, #051a11 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.25) 0%, transparent 70%)',
            borderRadius: '9999px',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '9999px',
            padding: '6px 18px',
            marginBottom: '28px',
          }}
        >
          <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em' }}>
            AI DEVELOPER TOOL
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '80px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1.05,
          }}
        >
          Doc
          <span style={{ color: '#10b981' }}>Scraper</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: '24px',
            fontSize: '26px',
            color: '#94a3b8',
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '780px',
            lineHeight: 1.5,
          }}
        >
          Transform any documentation site into structured Markdown for AI coding agents.
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#475569',
            fontSize: '16px',
          }}
        >
          <span style={{ color: '#10b981', fontWeight: 700 }}>docscraper.codiac.online</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
