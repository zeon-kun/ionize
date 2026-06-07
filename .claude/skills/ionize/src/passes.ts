// Pass 1 core, shared by the pass1-code script and the ionize dispatcher.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { walk } from './walk.ts';
import { detectLanguage } from './registry.ts';
import { getBundle, validateAllQueries } from './parser-pool.ts';
import { extractCode } from './extract-code.ts';
import { extractSql } from './extract-sql.ts';
import { makeGraph } from './graph-io.ts';
import type { Graph, GraphNode, GraphEdge } from './types.ts';

export interface Pass1Options {
  root: string;
  dialect: string;
  ignore: Set<string>;
  maxBytes: number;
}

export interface Pass1Stats {
  codeFiles: number;
  sqlFiles: number;
  sqlSkipped: number;
}

export interface Pass1Result {
  graph: Graph;
  stats: Pass1Stats;
}

export async function runPass1(opts: Pass1Options): Promise<Pass1Result> {
  await validateAllQueries(); // fail loud, early

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stats: Pass1Stats = { codeFiles: 0, sqlFiles: 0, sqlSkipped: 0 };

  for await (const file of walk(opts.root, { ignore: opts.ignore, maxBytes: opts.maxBytes })) {
    const det = detectLanguage(file);
    if (det.kind === 'skip') continue;
    const relPath = path.relative(opts.root, file);

    if (det.kind === 'sql') {
      const sql = await readFile(file, 'utf8');
      const res = extractSql({ sql, relPath, dialect: opts.dialect });
      nodes.push(...res.nodes);
      edges.push(...res.edges);
      stats.sqlSkipped += res.skipped;
      stats.sqlFiles++;
      continue;
    }

    const source = await readFile(file, 'utf8');
    const bundle = await getBundle(det.key);
    const tree = bundle.parser.parse(source);
    if (!tree) continue;
    const frag = extractCode({ relPath, lang: det.key, rootNode: tree.rootNode, query: bundle.query });
    tree.delete();
    nodes.push(...frag.nodes);
    edges.push(...frag.edges);
    stats.codeFiles++;
  }

  return { graph: makeGraph(opts.root, { nodes, edges }), stats };
}
