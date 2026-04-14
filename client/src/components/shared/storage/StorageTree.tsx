// storage-panel WU2: Recursive tree view for the StoragePanel.
//
// Each top-level node renders as a collapsible row. Direct children (files +
// sub-dirs one level down) render when expanded. Classification ('heavy' vs
// 'light') drives the marker colour/label; location ('holding') drives the
// "on T7" annotation + grey styling when the project is `held`.
//
// Classification is read from the server response — the UI never duplicates
// the heavy-subfolder list.
import { useState } from 'react';
import type { StorageTreeNode, StorageState } from '../../../../../shared/types';
import { formatBytes } from '../../../utils/formatBytes';

interface Props {
  nodes: StorageTreeNode[];
  state: StorageState;
}

function classificationMarker(node: StorageTreeNode, isHeldOnT7: boolean) {
  if (node.classification === 'heavy') {
    return {
      icon: '\u{1F7E0}', // 🟠
      label: 'heavy',
      greyed: isHeldOnT7,
    };
  }
  return {
    icon: '\u26AA', // ⚪
    label: 'light',
    greyed: false,
  };
}

function TreeRow({ node, state, depth }: { node: StorageTreeNode; state: StorageState; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  // Held + heavy + located in holding → greyed + "on T7"
  const isHeldHeavyOnT7 =
    state === 'held' && node.classification === 'heavy' && node.location === 'holding';
  const marker = classificationMarker(node, isHeldHeavyOnT7);

  const rowClasses = `flex items-center gap-2 py-1 text-sm ${
    marker.greyed ? 'text-warm-muted opacity-70' : 'text-warm-primary'
  }`;

  return (
    <li>
      <div className={rowClasses} style={{ paddingLeft: `${depth * 1.25}rem` }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            data-testid={`tree-toggle-${node.name}`}
            className="w-4 text-warm-muted hover:text-warm-primary"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span aria-hidden>{marker.icon}</span>
        <span className="flex-1 truncate font-mono">{node.name}</span>
        <span className="tabular-nums text-warm-secondary">{formatBytes(node.sizeBytes)}</span>
        <span className="text-[10px] uppercase tracking-wide text-warm-faint w-14 text-right">
          {marker.label}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-warm-faint w-16 text-right">
          {isHeldHeavyOnT7 ? 'on T7' : node.location === 'published' ? 'archived' : 'local'}
        </span>
      </div>
      {expanded && hasChildren && (
        <ul>
          {node.children!.map((child) => (
            <TreeRow key={child.path} node={child} state={state} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function StorageTree({ nodes, state }: Props) {
  if (nodes.length === 0) {
    return (
      <div
        data-testid="storage-tree-empty"
        className="text-sm text-warm-muted py-4 text-center border border-dashed border-warm rounded"
      >
        No files to display.
      </div>
    );
  }
  return (
    <ul data-testid="storage-tree" className="divide-y divide-warm/40">
      {nodes.map((n) => (
        <TreeRow key={n.path} node={n} state={state} depth={0} />
      ))}
    </ul>
  );
}
