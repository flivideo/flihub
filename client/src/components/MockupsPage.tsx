import { useState } from 'react';

/**
 * MockupsPage - Unified hub for all FliHub design mockups
 *
 * Links to:
 * 1. Mochaccino feature mockups (.mochaccino/designs/) — current feature explorations
 * 2. Legacy design system explorations (client/public/mocks/) — older full-app design variants
 */

const MOCHACCINO_DESIGNS = [
  {
    name: 'Recording Editor',
    slug: 'recording-editor',
    date: '2026-03-23',
    goal: 'Inline rename, renumber, and chapter split on the Recordings page',
  },
  {
    name: 'Sync Hub',
    slug: 'sync-hub',
    date: '2026-03-23',
    goal: 'Two-channel git sync with header indicators and conflict UI',
  },
  {
    name: 'Relay Redesign',
    slug: 'relay-redesign',
    date: '2026-03-22',
    goal: 'Relay collaboration UX with workflow lanes and file drawers',
  },
];

const LEGACY_DESIGNS = [
  { num: '01', name: 'Unified Content-Centric', desc: 'Clean tri-column layout, content in center, tools in margins' },
  { num: '02', name: 'Dark Cinematic', desc: 'Dark theme, video-first immersive layout with floating glass panels' },
  { num: '03', name: 'Command Palette Minimal', desc: 'Keyboard-driven single column, CMD+K palette, brutalist aesthetic' },
  { num: '04', name: 'Dense Dashboard', desc: 'Maximalist multi-panel power user interface with resizable panels' },
];

export function MockupsPage() {
  const [legacyExpanded, setLegacyExpanded] = useState(false);

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
      }}>
        <span style={{ fontSize: 28 }}>🎨</span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Design Mockups
        </h1>
        <a
          href="/mochaccino/index.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: 6,
            background: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Open Gallery
        </a>
      </div>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.5 }}>
        Standalone HTML mockups for exploring feature designs before implementation.
        Built with Mochaccino — self-contained, no build step required.
      </p>

      {/* Mochaccino Feature Mockups */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Feature Mockups
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 36,
      }}>
        {MOCHACCINO_DESIGNS.map((d) => (
          <a
            key={d.slug}
            href={`/mochaccino/designs/${d.slug}/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textDecoration: 'none',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.10)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{
              background: '#1e293b',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                {d.name}
              </span>
              <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                {d.date}
              </span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {d.goal}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Legacy Design Explorations */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
        <button
          onClick={() => setLegacyExpanded(!legacyExpanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 0,
            width: '100%',
          }}
        >
          <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.15s', transform: legacyExpanded ? 'rotate(90deg)' : 'none' }}>
            ▶
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
            Legacy Design Explorations
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            4 full-app design systems from Jan 2026
          </span>
          <a
            href="/mocks/index.html"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: 5,
              background: '#f1f5f9',
              color: '#475569',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid #e2e8f0',
            }}
          >
            Open Gallery
          </a>
        </button>

        {legacyExpanded && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}>
            {LEGACY_DESIGNS.map((d) => (
              <a
                key={d.num}
                href={`/mocks/design-${d.num === '01' ? '1' : d.num === '02' ? '2' : d.num === '03' ? '3' : '4'}/manage.html`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#3b82f6', fontSize: 16, fontWeight: 800 }}>{d.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{d.name}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{d.desc}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
