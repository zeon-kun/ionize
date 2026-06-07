// The normalized graph contract every pass emits and merge/to-canvas consume.

export type NodeType =
  | 'file'
  | 'class'
  | 'function'
  | 'module'
  | 'table'
  | 'view'
  | 'column'
  | 'concept'
  | 'media'
  | 'transcript';

export type EdgeType =
  | 'DECLARES'
  | 'IMPORTS'
  | 'CALLS'
  | 'FK'
  | 'JOINS'
  | 'REFERENCES'
  | 'MENTIONS';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  file?: string;
  lang?: string;
  line?: number;
  doc?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  /** true while `to` is a `ref:<name>` placeholder, before merge resolves it */
  unresolved?: boolean;
}

export interface Graph {
  version: number;
  source: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** A pass returns fragments of this shape; the file/source wrapper is added by the script. */
export interface Fragment {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const GRAPH_VERSION = 1;
