// Language registry: extension -> grammar wasm + query file.
// Adding a language is a single row here + a matching queries/<scm> file.

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url)); // src/
const SKILL_ROOT = path.resolve(here, '..');

export interface LanguageDef {
  key: string;
  exts: string[];
  wasm: string; // filename inside tree-sitter-wasms/out
  scm: string; // filename inside queries/
}

export const LANGUAGES: Record<string, LanguageDef> = {
  javascript: { key: 'javascript', exts: ['.js', '.jsx', '.mjs', '.cjs'], wasm: 'tree-sitter-javascript.wasm', scm: 'javascript.scm' },
  typescript: { key: 'typescript', exts: ['.ts', '.cts', '.mts'], wasm: 'tree-sitter-typescript.wasm', scm: 'typescript.scm' },
  tsx: { key: 'tsx', exts: ['.tsx'], wasm: 'tree-sitter-tsx.wasm', scm: 'typescript.scm' },
  python: { key: 'python', exts: ['.py', '.pyi'], wasm: 'tree-sitter-python.wasm', scm: 'python.scm' },
};

export const SQL_EXTS = ['.sql'];

const extIndex = new Map<string, string>();
for (const def of Object.values(LANGUAGES)) {
  for (const e of def.exts) extIndex.set(e, def.key);
}

export type Detection =
  | { kind: 'code'; key: string; def: LanguageDef; ext: string }
  | { kind: 'sql'; ext: string }
  | { kind: 'skip'; ext: string };

export function detectLanguage(filePath: string): Detection {
  const dot = filePath.lastIndexOf('.');
  const ext = dot === -1 ? '' : filePath.slice(dot).toLowerCase();
  if (SQL_EXTS.includes(ext)) return { kind: 'sql', ext };
  const key = extIndex.get(ext);
  if (key) return { kind: 'code', key, def: LANGUAGES[key], ext };
  return { kind: 'skip', ext };
}

/** Absolute path to a prebuilt grammar wasm in the tree-sitter-wasms package. */
export function wasmPath(file: string): string {
  const pkgJson = require.resolve('tree-sitter-wasms/package.json');
  return path.join(path.dirname(pkgJson), 'out', file);
}

/** Absolute path to a query file in this skill's queries/ dir. */
export function queryPath(file: string): string {
  return path.join(SKILL_ROOT, 'queries', file);
}
