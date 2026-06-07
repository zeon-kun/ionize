# SQL special path

## Engine
`node-sql-parser` (not tree-sitter — no usable SQL WASM grammar exists, and the AST is already semantically typed). Dialect from config (`sqlDialect`, default `PostgreSQL`).

```ts
import pkg from 'node-sql-parser';
const { Parser } = pkg;
const ast = new Parser().astify(sql, { database: 'PostgreSQL' });
```

## Resilience
Parse statement-by-statement (split on `;` when a whole-file parse throws). Wrap each in try/catch: skip and **count** failed statements, never abort the file. Large vendor dumps (`COMMENT ON`, custom types) routinely contain statements the parser rejects.

## Mapping
| SQL | Nodes | Edges |
|---|---|---|
| `CREATE TABLE t (...)` | `table:t`; `column:t.c` per column | `table:t --DECLARES--> column:t.c` |
| `FOREIGN KEY ... REFERENCES r` (inline or constraint) | — | `table:t --FK--> table:r` |
| `CREATE VIEW v AS SELECT ... FROM r` | `view:v` | `view:v --REFERENCES--> table:r` |
| `SELECT ... FROM a JOIN b` | — | `table:a --JOINS--> table:b` |

- Columns read from `create_definitions` where `resource === 'column'`.
- FKs from `create_definitions` where `resource === 'constraint'` and `constraint_type` includes `foreign key`, target via `reference_definition.table`.
- JOINs: for each `from` entry with a `join` field, emit a `JOINS` edge from the base table to the joined table (skip self).
- Tables referenced by views/selects that were never `CREATE`d still get a `table:` node (created lazily) so edges resolve.
