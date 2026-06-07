// Deterministic SQL extraction via node-sql-parser (no LLM, no tree-sitter).
// CREATE TABLE -> table + columns; FK -> table->table; CREATE VIEW -> view + refs; JOIN -> table->table.

import pkg from 'node-sql-parser';
import type { Fragment, GraphNode, GraphEdge } from './types.ts';

const { Parser } = pkg;

export interface ExtractSqlParams {
  sql: string;
  relPath: string;
  dialect?: string;
}

export interface SqlResult extends Fragment {
  skipped: number;
}

export function extractSql({ sql, relPath, dialect = 'PostgreSQL' }: ExtractSqlParams): SqlResult {
  const parser = new Parser();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let skipped = 0;

  const addTable = (name: string) => {
    const id = `table:${name}`;
    if (!nodes.has(id)) nodes.set(id, { id, type: 'table', name, file: relPath });
    return id;
  };

  const handle = (stmt: any) => {
    if (!stmt || typeof stmt !== 'object') return;

    // CREATE TABLE
    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const tName = tableName(stmt.table?.[0]);
      if (!tName) return;
      const tId = addTable(tName);
      for (const def of stmt.create_definitions ?? []) {
        if (def?.resource === 'column') {
          const col = columnName(def.column);
          if (col) {
            const cId = `column:${tName}.${col}`;
            nodes.set(cId, { id: cId, type: 'column', name: col, file: relPath });
            edges.push({ from: tId, to: cId, type: 'DECLARES' });
          }
          // inline column-level FK
          const ref = def.reference_definition?.table?.[0];
          const refName = tableName(ref);
          if (refName) edges.push({ from: tId, to: addTable(refName), type: 'FK' });
        } else if (def?.resource === 'constraint') {
          const ctype = String(def.constraint_type ?? '').toLowerCase();
          if (ctype.includes('foreign')) {
            const refName = tableName(def.reference_definition?.table?.[0]);
            if (refName) edges.push({ from: tId, to: addTable(refName), type: 'FK' });
          }
        }
      }
      return;
    }

    // CREATE VIEW
    if (stmt.type === 'create' && stmt.keyword === 'view') {
      const vName = tableName(stmt.view) ?? (typeof stmt.view === 'string' ? stmt.view : undefined);
      if (!vName) return;
      const vId = `view:${vName}`;
      nodes.set(vId, { id: vId, type: 'view', name: vName, file: relPath });
      const from = stmt.select?.from ?? stmt.definition?.from;
      for (const t of collectFromTables(from)) {
        edges.push({ from: vId, to: addTable(t), type: 'REFERENCES' });
      }
      emitJoins(from, addTable, edges);
      return;
    }

    // SELECT (top-level) -> JOIN edges
    if (stmt.type === 'select') {
      emitJoins(stmt.from, addTable, edges);
    }
  };

  let parsed = false;
  try {
    const ast = parser.astify(sql, { database: dialect });
    const list = Array.isArray(ast) ? ast : [ast];
    for (const s of list) handle(s);
    parsed = true;
  } catch {
    parsed = false;
  }

  // Fallback: parse statement-by-statement, skipping the ones that throw.
  if (!parsed) {
    for (const piece of splitStatements(sql)) {
      try {
        const ast = parser.astify(piece, { database: dialect });
        const list = Array.isArray(ast) ? ast : [ast];
        for (const s of list) handle(s);
      } catch {
        skipped++;
      }
    }
  }

  return { nodes: [...nodes.values()], edges, skipped };
}

function tableName(t: any): string | undefined {
  if (!t) return undefined;
  if (typeof t === 'string') return t;
  return t.table ?? t.view ?? undefined;
}

// node-sql-parser nests the column identifier at column.column.expr.value (v5).
function columnName(c: any): string | undefined {
  if (!c) return undefined;
  if (typeof c === 'string') return c;
  const inner = c.column ?? c;
  if (typeof inner === 'string') return inner;
  if (inner?.expr?.value != null) return String(inner.expr.value);
  return undefined;
}

function collectFromTables(from: any): string[] {
  if (!Array.isArray(from)) return [];
  const out: string[] = [];
  for (const f of from) {
    const n = tableName(f);
    if (n) out.push(n);
  }
  return out;
}

function emitJoins(from: any, addTable: (n: string) => string, edges: GraphEdge[]): void {
  if (!Array.isArray(from) || from.length === 0) return;
  const base = tableName(from[0]);
  if (!base) return;
  for (const f of from) {
    if (f?.join) {
      const joined = tableName(f);
      if (joined && joined !== base) {
        edges.push({ from: addTable(base), to: addTable(joined), type: 'JOINS' });
      }
    }
  }
}

/** Naive but resilient: split on semicolons not inside single quotes. */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') inStr = !inStr;
    if (ch === ';' && !inStr) {
      if (buf.trim()) out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}
