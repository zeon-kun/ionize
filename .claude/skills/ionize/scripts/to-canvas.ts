// Render a merged graph into graph.canvas (JSONCanvas 1.0) + nodes/*.md.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { GRAPH_DIR, VAULT_ROOT } from '../src/config.ts';
import { loadGraph } from '../src/graph-io.ts';
import { buildCanvas, buildNotes } from '../src/to-canvas.ts';
import type { LayoutMode } from '../src/layout.ts';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      in: { type: 'string' },
      'out-canvas': { type: 'string' },
      'out-notes': { type: 'string' },
      layout: { type: 'string' },
    },
  });

  const inFile = path.resolve(values.in ?? path.join(GRAPH_DIR, 'graph.merged.json'));
  const outCanvas = path.resolve(values['out-canvas'] ?? path.join(GRAPH_DIR, 'graph.canvas'));
  const outNotes = path.resolve(values['out-notes'] ?? path.join(GRAPH_DIR, 'nodes'));
  const mode = (values.layout as LayoutMode) ?? 'type';

  const graph = await loadGraph(inFile);

  // Canvas file references are vault-relative.
  const notePathPrefix = path.relative(VAULT_ROOT, outNotes).split(path.sep).join('/');
  const canvas = buildCanvas(graph, { mode, notePathPrefix });

  await mkdir(path.dirname(outCanvas), { recursive: true });
  await writeFile(outCanvas, JSON.stringify(canvas, null, 2) + '\n', 'utf8');

  await mkdir(outNotes, { recursive: true });
  const notes = buildNotes(graph);
  for (const note of notes) {
    await writeFile(path.join(outNotes, `${note.slug}.md`), note.content, 'utf8');
  }

  process.stderr.write(
    `Canvas: ${canvas.nodes.length} nodes, ${canvas.edges.length} edges → ${outCanvas}\n  notes: ${notes.length} → ${outNotes}/\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`to-canvas failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
