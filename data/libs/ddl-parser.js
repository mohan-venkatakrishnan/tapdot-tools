/**
 * ddl-parser.js — a tolerant SQL DDL parser for schema visualisation.
 *
 *   ddlParse(sql) → { tables, relations, dialect, warnings }
 *   ddlToDBML(parsed) → DBML source text
 *
 * Handles the CREATE TABLE / ALTER TABLE subset that actually appears in real
 * schema dumps across MySQL, PostgreSQL, SQLite, SQL Server and Oracle:
 * back-tick / double-quote / bracket quoting, inline and table-level
 * constraints, composite keys, and FKs added later via ALTER TABLE.
 *
 * It is deliberately NOT a full SQL grammar. Anything it can't classify is
 * skipped and reported in `warnings` rather than throwing — a schema dump that
 * is 95% understood should still draw a diagram, and silently dropping the
 * other 5% would be worse than saying so.
 *
 * All exported names are ddl-prefixed: shared.js owns ICONS / ICON_PATHS /
 * STEPS / TOOL_REGISTRY / COLLECTION_LABELS / tapdotAI in the same global
 * scope, and redeclaring one of those breaks the entire page (v13 changelog).
 */

/* ── Lexical helpers ──────────────────────────────────────────────────────── */

// Strip comments and string literals' contents can contain ';' or ')', so the
// splitter below has to be quote-aware rather than a plain .split(';').
function ddlStripComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i], next = sql[i + 1];
    if (c === '-' && next === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
    if (c === '#' ) { while (i < sql.length && sql[i] !== '\n') i++; continue; }
    if (c === '/' && next === '*') { i += 2; while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; out += c; i++;
      while (i < sql.length) {
        if (sql[i] === '\\') { out += sql.slice(i, i + 2); i += 2; continue; }
        if (sql[i] === q) { out += q; i++; break; }
        out += sql[i]; i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

function ddlSplitStatements(sql) {
  const stmts = [];
  let cur = '', depth = 0, quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += sql[++i] || ''; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ';' && depth === 0) { stmts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) stmts.push(cur);
  return stmts.map(s => s.trim()).filter(Boolean);
}

// Split a parenthesised body on top-level commas only — composite keys and
// types like DECIMAL(10,2) both contain commas that must not split.
function ddlSplitTopLevel(body) {
  const parts = [];
  let cur = '', depth = 0, quote = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += body[++i] || ''; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map(s => s.trim()).filter(Boolean);
}

const DDL_IDENT = '(?:`([^`]+)`|"([^"]+)"|\\[([^\\]]+)\\]|([A-Za-z_][\\w$]*))';

function ddlUnquote(m, offset) {
  return m[offset] || m[offset + 1] || m[offset + 2] || m[offset + 3] || '';
}

// `schema.table` → table (the schema qualifier is kept for display only).
function ddlSplitQualified(raw) {
  const m = raw.match(new RegExp(`^(?:${DDL_IDENT}\\s*\\.\\s*)?${DDL_IDENT}$`));
  if (!m) return { schema: null, name: raw.replace(/[`"\[\]]/g, '') };
  const schema = ddlUnquote(m, 1) || null;
  const name = ddlUnquote(m, 5);
  return { schema, name };
}

function ddlParseIdentList(text) {
  return ddlSplitTopLevel(text).map(s => {
    const m = s.trim().match(new RegExp('^' + DDL_IDENT));
    return m ? ddlUnquote(m, 1) : s.trim().replace(/[`"\[\]]/g, '');
  }).filter(Boolean);
}

/* ── Column & constraint parsing ──────────────────────────────────────────── */

// Reserved words that begin a TABLE-level constraint rather than a column.
const DDL_CONSTRAINT_START = /^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE(?:\s+KEY|\s+INDEX)?|KEY|INDEX|CHECK|EXCLUDE|FULLTEXT|SPATIAL|PERIOD)\b/i;

// Multi-word type names that would otherwise be truncated to their first token.
const DDL_MULTIWORD_TYPES = [
  'DOUBLE PRECISION', 'CHARACTER VARYING', 'BIT VARYING', 'TIME WITH TIME ZONE',
  'TIME WITHOUT TIME ZONE', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITHOUT TIME ZONE',
  'UNSIGNED BIG INT', 'NATIONAL CHARACTER', 'NATIONAL VARCHAR',
];

function ddlParseType(rest) {
  const upper = rest.toUpperCase();
  for (const t of DDL_MULTIWORD_TYPES) {
    if (upper.startsWith(t)) {
      const after = rest.slice(t.length);
      const paren = after.match(/^\s*\([^)]*\)/);
      // Keep the author's original casing rather than the uppercase lookup key.
      return { type: rest.slice(0, t.length) + (paren ? paren[0].trim() : ''), rest: after.slice(paren ? paren[0].length : 0) };
    }
  }
  const m = rest.match(/^([A-Za-z_]\w*)\s*(\([^)]*\))?((?:\s*\[\s*\d*\s*\])*)/);
  if (!m) return { type: '', rest };
  let type = m[1] + (m[2] ? m[2].replace(/\s+/g, '') : '') + (m[3] ? m[3].replace(/\s+/g, '') : '');
  let after = rest.slice(m[0].length);
  // MySQL numeric modifiers trail the type. The `\s*` inside the match above
  // can already have eaten the separating space, so this must not require one.
  const mod = after.match(/^\s*(UNSIGNED|ZEROFILL)\b(\s+(UNSIGNED|ZEROFILL)\b)?/i);
  if (mod) { type += ' ' + mod[0].trim().toLowerCase(); after = after.slice(mod[0].length); }
  return { type, rest: after };
}

function ddlParseColumn(def) {
  const m = def.match(new RegExp('^' + DDL_IDENT + '\\s+'));
  if (!m) return null;
  const name = ddlUnquote(m, 1);
  const { type, rest } = ddlParseType(def.slice(m[0].length));
  const flags = rest.toUpperCase();

  const col = {
    name,
    type: type || 'unknown',
    notNull: /\bNOT\s+NULL\b/.test(flags),
    primaryKey: /\bPRIMARY\s+KEY\b/.test(flags),
    unique: /\bUNIQUE\b/.test(flags),
    // SERIAL / AUTO_INCREMENT / IDENTITY all mean "the database fills this in".
    autoInc: /\bAUTO_?INCREMENT\b/.test(flags) || /\bGENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\b/.test(flags) || /^(SMALL|BIG)?SERIAL/i.test(type),
    default: null,
    comment: null,
    ref: null,
  };

  const def_ = rest.match(/\bDEFAULT\s+('(?:[^']|'')*'|[^\s,]+(?:\([^)]*\))?)/i);
  if (def_) col.default = def_[1];
  const cm = rest.match(/\bCOMMENT\s+'((?:[^']|'')*)'/i);
  if (cm) col.comment = cm[1].replace(/''/g, "'");

  // Inline REFERENCES → a relationship with no explicit constraint name.
  const ref = rest.match(new RegExp('\\bREFERENCES\\s+((?:' + DDL_IDENT + '\\s*\\.\\s*)?' + DDL_IDENT + ')\\s*(?:\\(([^)]*)\\))?', 'i'));
  if (ref) {
    const target = ddlSplitQualified(ref[1].trim());
    col.ref = { table: target.name, columns: ref[10] ? ddlParseIdentList(ref[10]) : [] };
  }
  return col;
}

function ddlParseConstraint(def, table, out) {
  let text = def;
  let cname = null;
  const named = text.match(new RegExp('^CONSTRAINT\\s+' + DDL_IDENT + '\\s+', 'i'));
  if (named) { cname = ddlUnquote(named, 1); text = text.slice(named[0].length); }

  let m;
  // The optional index name may be quoted (`idx`, "idx", [idx]) — a bare \w+
  // silently failed to match those and the whole constraint was dropped.
  if ((m = text.match(new RegExp('^PRIMARY\\s+KEY\\s*(?:' + DDL_IDENT + '\\s*)?\\(([^)]*)\\)', 'i')))) {
    out.primaryKey = ddlParseIdentList(m[5]);
    return true;
  }
  if ((m = text.match(new RegExp('^FOREIGN\\s+KEY\\s*(?:' + DDL_IDENT + '\\s*)?\\(([^)]*)\\)\\s*REFERENCES\\s+((?:' + DDL_IDENT + '\\s*\\.\\s*)?' + DDL_IDENT + ')\\s*(?:\\(([^)]*)\\))?([\\s\\S]*)$', 'i')))) {
    const fromCols = ddlParseIdentList(m[5]);
    const target = ddlSplitQualified(m[6].trim());
    const toCols = m[15] ? ddlParseIdentList(m[15]) : [];
    const tail = (m[16] || '').toUpperCase();
    out.foreignKeys.push({
      name: cname,
      columns: fromCols,
      refTable: target.name,
      refColumns: toCols,
      onDelete: (tail.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/) || [])[1] || null,
      onUpdate: (tail.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/) || [])[1] || null,
    });
    return true;
  }
  if ((m = text.match(new RegExp('^UNIQUE(?:\\s+KEY|\\s+INDEX)?\\s*(?:' + DDL_IDENT + '\\s*)?\\(([^)]*)\\)', 'i')))) {
    out.uniques.push(ddlParseIdentList(m[5]));
    return true;
  }
  if (/^(KEY|INDEX|CHECK|FULLTEXT|SPATIAL|EXCLUDE|PERIOD)\b/i.test(text)) return true; // recognised, not drawn
  return false;
}

/* ── Dialect detection ────────────────────────────────────────────────────── */

function ddlDetectDialect(sql) {
  const s = sql.toUpperCase();
  if (/`/.test(sql) || /\bAUTO_INCREMENT\b/.test(s) || /\bENGINE\s*=/.test(s)) return 'MySQL / MariaDB';
  if (/\bSERIAL\b/.test(s) || /\bBIGSERIAL\b/.test(s) || /::\w/.test(sql) || /\bJSONB\b/.test(s) || /\bTEXT\[\]/.test(s)) return 'PostgreSQL';
  if (/\bAUTOINCREMENT\b/.test(s) || /\bINTEGER\s+PRIMARY\s+KEY\b/.test(s)) return 'SQLite';
  if (/\[[\w ]+\]/.test(sql) || /\bNVARCHAR\b/.test(s) || /\bIDENTITY\s*\(/.test(s)) return 'SQL Server';
  if (/\bNUMBER\s*\(/.test(s) || /\bVARCHAR2\b/.test(s)) return 'Oracle';
  return 'Generic SQL';
}

/* ── Main entry ───────────────────────────────────────────────────────────── */

function ddlParse(sql) {
  const warnings = [];
  const tables = [];
  const byName = new Map();
  const clean = ddlStripComments(sql);

  const createRe = new RegExp(
    '^CREATE\\s+(?:GLOBAL\\s+|LOCAL\\s+|TEMP(?:ORARY)?\\s+|UNLOGGED\\s+)*TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?' +
    '((?:' + DDL_IDENT + '\\s*\\.\\s*)?' + DDL_IDENT + ')\\s*\\(([\\s\\S]*)\\)[^)]*$', 'i');

  for (const stmt of ddlSplitStatements(clean)) {
    const cm = stmt.match(createRe);
    if (cm) {
      const { schema, name } = ddlSplitQualified(cm[1].trim());
      const table = {
        name, schema,
        columns: [], primaryKey: [], foreignKeys: [], uniques: [],
      };
      for (const part of ddlSplitTopLevel(cm[10])) {
        if (DDL_CONSTRAINT_START.test(part)) {
          if (!ddlParseConstraint(part, table, table)) warnings.push(`Skipped a constraint in "${name}": ${part.slice(0, 60)}`);
          continue;
        }
        const col = ddlParseColumn(part);
        if (col) table.columns.push(col);
        else warnings.push(`Skipped an unrecognised definition in "${name}": ${part.slice(0, 60)}`);
      }
      // Fold inline PRIMARY KEY / REFERENCES into the table-level lists so the
      // renderer has one place to look.
      for (const c of table.columns) {
        if (c.primaryKey && !table.primaryKey.includes(c.name)) table.primaryKey.push(c.name);
        if (c.ref) table.foreignKeys.push({ name: null, columns: [c.name], refTable: c.ref.table, refColumns: c.ref.columns, onDelete: null, onUpdate: null });
      }
      tables.push(table);
      byName.set(name.toLowerCase(), table);
      continue;
    }

    // FKs and PKs are very often added after the fact.
    const am = stmt.match(new RegExp('^ALTER\\s+TABLE\\s+(?:ONLY\\s+)?((?:' + DDL_IDENT + '\\s*\\.\\s*)?' + DDL_IDENT + ')\\s+ADD\\s+([\\s\\S]*)$', 'i'));
    if (am) {
      const { name } = ddlSplitQualified(am[1].trim());
      const t = byName.get(name.toLowerCase());
      if (!t) { warnings.push(`ALTER TABLE refers to unknown table "${name}"`); continue; }
      if (!ddlParseConstraint(am[10].trim(), t, t)) warnings.push(`Skipped an ALTER on "${name}": ${am[10].slice(0, 60)}`);
      continue;
    }

    if (/^(CREATE|ALTER|DROP|INSERT|SET|COMMENT|GRANT|BEGIN|COMMIT|USE)\b/i.test(stmt)) continue; // not schema shape
    if (stmt.trim()) warnings.push(`Ignored statement: ${stmt.slice(0, 60)}`);
  }

  /* Relationships. Declared FKs are authoritative; on top of those we INFER
     links from the near-universal `<table>_id` / `<table>Id` naming convention,
     because plenty of real schemas (especially MySQL with MyISAM history, or
     ORM-managed ones) never declare foreign keys at all. Inferred links are
     flagged so the diagram can draw them differently — a guess must never look
     like a declared constraint. */
  const relations = [];
  const declared = new Set();

  // True when `cols` is exactly some key of `t` (its full PK, a full UNIQUE
  // constraint, or a single column declared UNIQUE) — i.e. one row per value.
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.some(y => y.toLowerCase() === x.toLowerCase()));
  function ddlCoversKey(cols, t) {
    if (t.primaryKey.length && sameSet(cols, t.primaryKey)) return true;
    if (t.uniques.some(u => sameSet(cols, u))) return true;
    return cols.length === 1 && !!(t.columns.find(x => x.name === cols[0]) || {}).unique;
  }

  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      const target = byName.get(String(fk.refTable).toLowerCase());
      if (!target) { warnings.push(`"${t.name}" references unknown table "${fk.refTable}"`); continue; }
      const key = `${t.name}.${fk.columns.join(',')}`;
      declared.add(key);
      relations.push({
        from: t.name, fromColumns: fk.columns,
        to: target.name, toColumns: fk.refColumns.length ? fk.refColumns : target.primaryKey,
        inferred: false,
        // 1:1 only when the FK columns are themselves unique on this side. That
        // requires covering a WHOLE key — `invoice_id` inside a composite PK of
        // (invoice_id, idx) is not unique on its own, so that link is 1:N.
        oneToOne: ddlCoversKey(fk.columns, t),
        onDelete: fk.onDelete,
      });
    }
  }

  const singular = (n) => n.replace(/ies$/i, 'y').replace(/s$/i, '');
  for (const t of tables) {
    for (const c of t.columns) {
      const m = c.name.match(/^(.*?)_?(id|Id|ID)$/);
      if (!m || !m[1]) continue;
      if (declared.has(`${t.name}.${c.name}`)) continue;
      if (t.foreignKeys.some(fk => fk.columns.includes(c.name))) continue;
      const stem = m[1].toLowerCase();
      const target = tables.find(x => {
        const n = x.name.toLowerCase();
        return x !== t && (n === stem || singular(n) === stem || n === stem + 's' || n === stem.replace(/y$/, 'ies'));
      });
      if (!target) continue;
      relations.push({
        from: t.name, fromColumns: [c.name],
        to: target.name, toColumns: target.primaryKey.length ? target.primaryKey : ['id'],
        inferred: true, oneToOne: false, onDelete: null,
      });
    }
  }

  return { tables, relations, dialect: ddlDetectDialect(clean), warnings };
}

/* ── DBML export (dbdiagram.io's format) ──────────────────────────────────── */

function ddlToDBML(parsed) {
  const q = (n) => (/^[A-Za-z_]\w*$/.test(n) ? n : `"${n}"`);
  const lines = [];
  for (const t of parsed.tables) {
    lines.push(`Table ${q(t.name)} {`);
    for (const c of t.columns) {
      const attrs = [];
      if (t.primaryKey.length === 1 && t.primaryKey[0] === c.name) attrs.push('pk');
      if (c.autoInc) attrs.push('increment');
      if (c.notNull && !attrs.includes('pk')) attrs.push('not null');
      if (c.unique) attrs.push('unique');
      if (c.default) attrs.push(`default: ${c.default}`);
      if (c.comment) attrs.push(`note: '${c.comment.replace(/'/g, "\\'")}'`);
      lines.push(`  ${q(c.name)} ${c.type}${attrs.length ? ` [${attrs.join(', ')}]` : ''}`);
    }
    if (t.primaryKey.length > 1) {
      lines.push('  indexes {');
      lines.push(`    (${t.primaryKey.map(q).join(', ')}) [pk]`);
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }
  for (const r of parsed.relations) {
    if (r.inferred) lines.push('// inferred from naming convention, not a declared constraint');
    const op = r.oneToOne ? '-' : '>';
    lines.push(`Ref: ${q(r.from)}.${q(r.fromColumns[0] || 'id')} ${op} ${q(r.to)}.${q(r.toColumns[0] || 'id')}`);
  }
  return lines.join('\n');
}
