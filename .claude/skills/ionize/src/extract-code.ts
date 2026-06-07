// Tree-sitter captures -> normalized {nodes, edges}.
// Language-agnostic: keyed only on the shared capture vocabulary in the .scm files.

import type Parser from 'web-tree-sitter';
import type { Fragment, GraphNode, GraphEdge, NodeType } from './types.ts';

export interface ExtractCodeParams {
  relPath: string;
  lang: string;
  rootNode: Parser.SyntaxNode;
  query: Parser.Query;
}

export function extractCode({ relPath, lang, rootNode, query }: ExtractCodeParams): Fragment {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const fileId = `file:${relPath}`;
  nodes.push({ id: fileId, type: 'file', name: relPath, file: relPath, lang });

  const matches = query.matches(rootNode);

  const defByTsId = new Map<number, string>(); // ts node id -> our symbol id (enclosing-scope lookup)
  const commentByEndRow = new Map<number, string>();

  // Pass A: definitions + comments.
  for (const m of matches) {
    const caps = m.captures;

    const comment = caps.find((c) => c.name === 'comment');
    if (comment) {
      const text = comment.node.text
        .replace(/^\s*(\/\/+|#+|\/\*+|\*+)/, '')
        .replace(/\*+\/\s*$/, '')
        .trim();
      if (text) commentByEndRow.set(comment.node.endPosition.row, text.slice(0, 200));
      continue;
    }

    const defCap = caps.find((c) => c.name.startsWith('definition.'));
    if (!defCap) continue;
    const nameCap = caps.find((c) => c.name.startsWith('name.'));
    const name = nameCap?.node.text ?? '(anonymous)';
    const line = defCap.node.startPosition.row + 1;
    const type: NodeType = defCap.name === 'definition.class' ? 'class' : 'function';
    const id = `sym:${relPath}#${name}@${line}`;
    nodes.push({ id, type, name, file: relPath, lang, line });
    edges.push({ from: fileId, to: id, type: 'DECLARES' });
    defByTsId.set(defCap.node.id, id);
  }

  // Attach the comment immediately above a definition as its doc.
  for (const n of nodes) {
    if ((n.type === 'class' || n.type === 'function') && n.line != null) {
      const doc = commentByEndRow.get(n.line - 2);
      if (doc) n.doc = doc;
    }
  }

  // Pass B: imports + calls.
  for (const m of matches) {
    const caps = m.captures;

    const importSrc = caps.find((c) => c.name === 'import.source');
    if (importSrc) {
      const target = importSrc.node.text.replace(/['"]/g, '').trim();
      if (target) {
        edges.push({ from: fileId, to: `module:${target}`, type: 'IMPORTS' });
        nodes.push({ id: `module:${target}`, type: 'module', name: target });
      }
      continue;
    }

    const callName = caps.find((c) => c.name === 'call.name');
    if (callName) {
      const caller = enclosingDef(callName.node, defByTsId) ?? fileId;
      const callee = callName.node.text.trim();
      if (callee) edges.push({ from: caller, to: `ref:${callee}`, type: 'CALLS', unresolved: true });
    }
  }

  return { nodes, edges };
}

function enclosingDef(node: Parser.SyntaxNode, defByTsId: Map<number, string>): string | null {
  let cur: Parser.SyntaxNode | null = node.parent;
  while (cur) {
    const id = defByTsId.get(cur.id);
    if (id) return id;
    cur = cur.parent;
  }
  return null;
}
