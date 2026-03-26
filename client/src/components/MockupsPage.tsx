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

// Round 1 survivors (loved/liked from initial 10)
const PROJECT_LIST_ORIGINALS = [
  {
    name: '01 Filterable Table',
    slug: 'project-list-01-filterable-table',
    goal: 'Full-width table with search, column sorts, smart preset filters (Dead, Needs Attention, Ready to Edit)',
  },
  {
    name: '02 Kanban Pipeline',
    slug: 'project-list-02-kanban-pipeline',
    goal: 'Horizontal swim lanes by stage, compact cards, collapse per column, dead project dimming',
  },
  {
    name: '06 Split Focus',
    slug: 'project-list-06-split-focus',
    goal: 'Left list + right detail panel, pin-to-compare up to 3 projects side-by-side',
  },
  {
    name: '10 Hybrid Table + Drawer',
    slug: 'project-list-10-hybrid-table-drawer',
    goal: 'Clean table + slide-out detail drawer with health assessment on row click, Shift+Click to compare',
  },
];

// Round 2: refined combinations (click = select project + show detail)
const PROJECT_LIST_REFINED = [
  {
    name: 'A) Table + Drawer',
    slug: 'project-list-a-table-drawer',
    goal: 'Filterable table (01) + slide-out drawer. Click = select project + open drawer. Health assessment, progress checklist.',
  },
  {
    name: 'B) Table + Hover Card',
    slug: 'project-list-b-table-hover',
    goal: 'Filterable table + floating detail card on hover. Click = select. Hover = peek. Pin card via info icon.',
  },
  {
    name: 'C) Table + Kanban Toggle',
    slug: 'project-list-c-table-kanban',
    goal: 'List/Board view toggle. Same filters, same drawer. Two perspectives on the same data.',
  },
  {
    name: 'D) Table + Inline Expand',
    slug: 'project-list-d-table-inline',
    goal: 'Click row to expand detail panel inline below it. No layout shift. Context stays connected to the row.',
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

      {/* Round 2: Refined Combinations */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Project List — Refined
        <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
          Click = select project + show detail
        </span>
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 36,
      }}>
        {PROJECT_LIST_REFINED.map((d) => (
          <a
            key={d.slug}
            href={`/mochaccino/designs/${d.slug}/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textDecoration: 'none',
              background: '#fff',
              border: '2px solid #3b82f6',
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.20)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{
              background: '#1e40af',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                {d.name}
              </span>
              <span style={{ color: '#93c5fd', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                2026-03-25
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

      {/* Round 1: Original survivors */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Project List — Round 1
        <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
          4 survivors from initial 10 explorations
        </span>
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 36,
      }}>
        {PROJECT_LIST_ORIGINALS.map((d) => (
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
              background: '#3b2f5b',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                {d.name}
              </span>
              <span style={{ color: '#a78bfa', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                2026-03-25
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
