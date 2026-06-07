// Merge logic shared by the merge-graph script and the ionize dispatcher.

import { sortGraph } from './graph-io.ts';
import { GRAPH_VERSION } from './types.ts';
import type { Graph, GraphNode, GraphEdge } from './types.ts';

function fileOf(id: string): string | undefined {
  if (id.startsWith('file:')) return id.slice('file:'.length);
  if (id.startsWith('sym:')) {
    const hash = id.indexOf('#');
    return hash === -1 ? undefined : id.slice('sym:'.length, hash);
  }
  return undefined;
}

export interface MergeResult {
  graph: Graph;
  dropped: number;
}

/** Dedupe nodes, resolve `ref:` CALLS within file, drop dangling edges, union + sort. */
export function mergeGraphs(graphs: Graph[]): MergeResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let source = '';
  for (const g of graphs) {
    if (!source) source = g.source;
    nodes.push(...g.nodes);
    edges.push(...g.edges);
  }

  const deduped = sortGraph({ version: GRAPH_VERSION, source, nodes, edges: [] });
  const nodeIds = new Set(deduped.nodes.map((n) => n.id));
  const symByFileName = new Map<string, string>();
  for (const n of deduped.nodes) {
    if ((n.type === 'function' || n.type === 'class') && n.file) {
      const key = `${n.file} ${n.name}`;
      if (!symByFileName.has(key)) symByFileName.set(key, n.id);
    }
  }

  const resolved: GraphEdge[] = [];
  let dropped = 0;
  for (const e of edges) {
    if (e.type === 'CALLS' && e.to.startsWith('ref:')) {
      const name = e.to.slice('ref:'.length);
      const fromFile = fileOf(e.from);
      const hit = fromFile ? symByFileName.get(`${fromFile} ${name}`) : undefined;
      if (hit && hit !== e.from) resolved.push({ from: e.from, to: hit, type: 'CALLS' });
      else dropped++;
      continue;
    }
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) resolved.push(e);
    else dropped++;
  }

  const graph = sortGraph({ version: GRAPH_VERSION, source, nodes: deduped.nodes, edges: resolved });
  return { graph, dropped };
}
