// Dispatcher — the v1 happy path: pass1 → merge → to-canvas, into the vault graph/ dir.
// Pass 2/3 are opt-in (--media, --semantic) and no-ops in v1.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, GRAPH_DIR, VAULT_ROOT } from '../src/config.ts';
import { runPass1 } from '../src/passes.ts';
import { mergeGraphs } from '../src/merge.ts';
import { saveGraph } from '../src/graph-io.ts';
import { buildCanvas, buildNotes } from '../src/to-canvas.ts';
import type { LayoutMode } from '../src/layout.ts';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      root: { type: 'string' },
      layout: { type: 'string' },
      'sql-dialect': { type: 'string' },
      media: { type: 'boolean' },
      semantic: { type: 'boolean' },
    },
  });

  const cfg = await loadConfig();
  const root = path.resolve(values.root ?? cfg.root);
  const mode = (values.layout as LayoutMode) ?? cfg.layout;

  // Pass 1 (working)
  const { graph: pass1, stats } = await runPass1({
    root,
    dialect: values['sql-dialect'] ?? cfg.sqlDialect,
    ignore: new Set(cfg.ignore),
    maxBytes: cfg.maxFileBytes,
  });
  await saveGraph(path.join(GRAPH_DIR, 'graph.json'), pass1);
  process.stderr.write(
    `Pass 1: ${stats.codeFiles} code + ${stats.sqlFiles} sql → ${pass1.nodes.length} nodes, ${pass1.edges.length} edges\n`,
  );

  if (values.media) process.stderr.write('Pass 2 (media): not implemented in v1 — skipped.\n');
  if (values.semantic) process.stderr.write('Pass 3 (semantic): not implemented in v1 — skipped.\n');

  // Merge
  const { graph, dropped } = mergeGraphs([pass1]);
  await saveGraph(path.join(GRAPH_DIR, 'graph.merged.json'), graph);
  process.stderr.write(`Merge: ${graph.nodes.length} nodes, ${graph.edges.length} edges (${dropped} dropped)\n`);

  // Render
  const outCanvas = path.join(GRAPH_DIR, 'graph.canvas');
  const outNotes = path.join(GRAPH_DIR, 'nodes');
  const notePathPrefix = path.relative(VAULT_ROOT, outNotes).split(path.sep).join('/');

  const canvas = buildCanvas(graph, { mode, notePathPrefix });
  await mkdir(path.dirname(outCanvas), { recursive: true });
  await writeFile(outCanvas, JSON.stringify(canvas, null, 2) + '\n', 'utf8');

  await mkdir(outNotes, { recursive: true });
  const notes = buildNotes(graph);
  for (const note of notes) await writeFile(path.join(outNotes, `${note.slug}.md`), note.content, 'utf8');

  process.stderr.write(
    `Canvas: ${canvas.nodes.length} nodes, ${canvas.edges.length} edges → ${outCanvas}\n` +
      `Notes: ${notes.length} → ${outNotes}/\n` +
      `Done. Open ${path.relative(process.cwd(), outCanvas)} in Obsidian.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`ionize failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
