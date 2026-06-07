// Lazy, cached tree-sitter parsers + compiled queries, keyed by language.
// web-tree-sitter 0.22 API: default export `Parser` with namespaced Parser.Language / Parser.Query,
// queries built via `language.query(source)`.

import { readFile } from 'node:fs/promises';
import Parser from 'web-tree-sitter';
import { LANGUAGES, wasmPath, queryPath } from './registry.ts';

let initialized = false;

export interface LangBundle {
  parser: Parser;
  language: Parser.Language;
  query: Parser.Query;
}

const cache = new Map<string, LangBundle>();

async function ensureInit(): Promise<void> {
  if (initialized) return;
  await Parser.init();
  initialized = true;
}

/** Get (or build) the parser + compiled query for a language key. Throws loudly if the .scm is invalid. */
export async function getBundle(key: string): Promise<LangBundle> {
  const cached = cache.get(key);
  if (cached) return cached;

  const def = LANGUAGES[key];
  if (!def) throw new Error(`Unknown language key: ${key}`);

  await ensureInit();
  const language = await Parser.Language.load(wasmPath(def.wasm));
  const parser = new Parser();
  parser.setLanguage(language);

  const scm = await readFile(queryPath(def.scm), 'utf8');
  // Throws on an invalid node type / capture — fail loud, fail early.
  const query = language.query(scm);

  const bundle: LangBundle = { parser, language, query };
  cache.set(key, bundle);
  return bundle;
}

/** Validate every registered language's query compiles. Used at startup. */
export async function validateAllQueries(): Promise<void> {
  for (const key of Object.keys(LANGUAGES)) {
    await getBundle(key);
  }
}
