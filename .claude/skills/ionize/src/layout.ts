// Deterministic banded-grid layout. No randomness, no force sim.
// Bucket by key (type or file), fixed column bands, sorted within band by id.

import type { Graph, GraphNode, NodeType } from './types.ts';

const COL_W = 320;
const GAP = 200;
const ROW_H = 120;
const NODE_W = 280;
const NODE_H = 80;

const TYPE_ORDER: NodeType[] = [
  'file', 'class', 'function', 'module', 'table', 'view', 'column', 'concept', 'media', 'transcript',
];

const COLOR: Record<NodeType, string> = {
  file: '5',
  class: '6',
  function: '4',
  module: '2',
  table: '1',
  view: '3',
  column: '6',
  concept: '2',
  media: '3',
  transcript: '4',
};

export const EDGE_COLOR: Record<string, string> = {
  DECLARES: '4',
  IMPORTS: '2',
  CALLS: '5',
  FK: '1',
  JOINS: '3',
  REFERENCES: '6',
  MENTIONS: '2',
};

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export type LayoutMode = 'type' | 'file';

export function layout(graph: Graph, mode: LayoutMode = 'type'): Map<string, Position> {
  const buckets = new Map<string, GraphNode[]>();
  for (const n of graph.nodes) {
    const key = mode === 'file' ? (n.file ?? '~') : n.type;
    const arr = buckets.get(key);
    if (arr) arr.push(n);
    else buckets.set(key, [n]);
  }

  // Stable band order: TYPE_ORDER for type mode, alphabetical for file mode.
  const bandKeys =
    mode === 'file'
      ? [...buckets.keys()].sort((a, b) => a.localeCompare(b))
      : TYPE_ORDER.filter((t) => buckets.has(t));

  const pos = new Map<string, Position>();
  bandKeys.forEach((key, band) => {
    const arr = buckets.get(key)!;
    arr.sort((a, b) => a.id.localeCompare(b.id));
    arr.forEach((n, i) => {
      pos.set(n.id, {
        x: band * (COL_W + GAP),
        y: i * ROW_H,
        width: NODE_W,
        height: NODE_H,
        color: COLOR[n.type] ?? '0',
      });
    });
  });
  return pos;
}
