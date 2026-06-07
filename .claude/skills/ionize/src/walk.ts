// Deterministic corpus walk: sorted entries, ignore set, size cap.

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_IGNORE = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'vendor', '.venv', '__pycache__',
]);

export interface WalkOptions {
  ignore?: Set<string>;
  maxBytes?: number;
}

/** Yields absolute file paths in a stable (sorted) order. */
export async function* walk(root: string, opts: WalkOptions = {}): AsyncGenerator<string> {
  const ignore = opts.ignore ?? DEFAULT_IGNORE;
  const maxBytes = opts.maxBytes ?? 2_000_000;

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const e of entries) {
    if (ignore.has(e.name)) continue;
    if (e.name.startsWith('.') && e.isDirectory()) continue; // skip dotdirs (.git handled above)
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      yield* walk(full, opts);
    } else if (e.isFile()) {
      const s = await stat(full);
      if (s.size <= maxBytes) yield full;
    }
  }
}
