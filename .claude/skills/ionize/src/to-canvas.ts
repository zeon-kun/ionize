// Pure transforms: graph -> JSONCanvas 1.0 data, and graph -> per-node markdown notes.
// The script layer handles file IO; these stay deterministic and testable.

import type { Graph, GraphNode, GraphEdge } from './types.ts';
import { layout, EDGE_COLOR, type LayoutMode } from './layout.ts';
import { slug } from './graph-io.ts';

export interface CanvasNode {
  id: string;
  type: 'file';
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}
export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide: 'right';
  toSide: 'left';
  label: string;
  color?: string;
}
export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface BuildCanvasOptions {
  mode?: LayoutMode;
  /** vault-relative dir holding the note files, e.g. "graph/nodes". */
  notePathPrefix: string;
}

export function buildCanvas(graph: Graph, opts: BuildCanvasOptions): CanvasData {
  const pos = layout(graph, opts.mode ?? 'type');
  const idMap = new Map<string, string>(); // graph node id -> canvas id (n<i>)
  graph.nodes.forEach((n, i) => idMap.set(n.id, `n${i}`));

  const nodes: CanvasNode[] = graph.nodes.map((n, i) => {
    const p = pos.get(n.id)!;
    return {
      id: `n${i}`,
      type: 'file',
      file: `${opts.notePathPrefix}/${slug(n.id)}.md`,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      color: p.color,
    };
  });

  const edges: CanvasEdge[] = [];
  graph.edges.forEach((e, i) => {
    const fromNode = idMap.get(e.from);
    const toNode = idMap.get(e.to);
    if (!fromNode || !toNode) return; // drop dangling
    edges.push({
      id: `e${i}`,
      fromNode,
      toNode,
      fromSide: 'right',
      toSide: 'left',
      label: e.type,
      color: EDGE_COLOR[e.type],
    });
  });

  return { nodes, edges };
}

export interface NoteFile {
  slug: string;
  content: string;
}

export function buildNotes(graph: Graph): NoteFile[] {
  const outgoing = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    const arr = outgoing.get(e.from);
    if (arr) arr.push(e);
    else outgoing.set(e.from, [e]);
  }
  const ids = new Set(graph.nodes.map((n) => n.id));

  return graph.nodes.map((n) => ({ slug: slug(n.id), content: noteContent(n, outgoing.get(n.id) ?? [], ids) }));
}

function noteContent(n: GraphNode, edges: GraphEdge[], ids: Set<string>): string {
  const fm: string[] = ['---', `id: ${JSON.stringify(n.id)}`, `type: ${n.type}`, `name: ${JSON.stringify(n.name)}`];
  if (n.file) fm.push(`file: ${JSON.stringify(n.file)}`);
  if (n.lang) fm.push(`lang: ${n.lang}`);
  if (n.line !== undefined) fm.push(`line: ${n.line}`);
  fm.push('tags: [ionize]');
  fm.push('---');

  const body: string[] = ['', `# ${n.name}`, ''];
  const where = n.file ? ` — declared in [[${slug(`file:${n.file}`)}]]` : '';
  const at = n.line !== undefined ? `, line ${n.line}` : '';
  body.push(`\`${n.type}\`${where}${at}.`);
  if (n.doc) body.push('', `> ${n.doc}`);

  const resolved = edges.filter((e) => ids.has(e.to));
  if (resolved.length) {
    body.push('', '## Edges');
    for (const e of resolved.sort((a, b) => `${a.type} ${a.to}`.localeCompare(`${b.type} ${b.to}`))) {
      body.push(`- ${e.type} → [[${slug(e.to)}]]`);
    }
  }
  body.push('');
  return fm.join('\n') + body.join('\n');
}
