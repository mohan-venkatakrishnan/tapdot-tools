// SQLObfuscate — regex-based tokenizer that swaps identifiers, string
// literals, numeric literals, and comments for consistent placeholders.
// Not a real SQL parser: every non-keyword word is treated as an identifier.

const $ = (id) => document.getElementById(id);

const KEYWORDS = new Set([
  'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'outer', 'full', 'cross',
  'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'insert', 'into', 'values',
  'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'index', 'primary', 'key',
  'foreign', 'references', 'not', 'null', 'default', 'unique', 'check', 'constraint', 'as',
  'and', 'or', 'in', 'exists', 'between', 'like', 'ilike', 'is', 'distinct', 'union', 'all',
  'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max',
  'cast', 'coalesce', 'with', 'recursive', 'over', 'partition', 'window', 'using', 'natural',
  'if', 'begin', 'commit', 'rollback', 'transaction', 'grant', 'revoke', 'database', 'schema',
  'view', 'trigger', 'procedure', 'function', 'returns', 'return', 'declare', 'varchar', 'int',
  'integer', 'float', 'double', 'decimal', 'date', 'datetime', 'timestamp', 'boolean', 'bool',
  'text', 'blob', 'char', 'numeric', 'true', 'false', 'top', 'lateral', 'array', 'json',
  'jsonb', 'serial', 'bigint', 'smallint', 'real', 'precision', 'interval', 'current_date',
  'current_time', 'current_timestamp', 'now', 'add', 'column', 'columns', 'cascade', 'restrict',
  'temporary', 'temp', 'unsigned', 'zerofill', 'auto_increment', 'engine', 'charset', 'collate',
]);

const MASTER_RE = /(--[^\n]*)|(\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.|'')*')|("(?:[^"\\]|\\.)*")|(`(?:[^`\\]|\\.)*`)|(\b\d+\.\d+\b|\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

function obfuscate(sql, opts) {
  const identMap = new Map();
  const stringMap = new Map();
  const numberMap = new Map();
  let identCounter = 0, stringCounter = 0, numberCounter = 0;

  function identFor(raw) {
    const key = raw.toLowerCase();
    if (!identMap.has(key)) identMap.set(key, 'col' + (++identCounter));
    return identMap.get(key);
  }
  function stringFor(raw) {
    if (!stringMap.has(raw)) stringMap.set(raw, "'str" + (++stringCounter) + "'");
    return stringMap.get(raw);
  }
  function numberFor(raw) {
    if (!numberMap.has(raw)) numberMap.set(raw, String(++numberCounter));
    return numberMap.get(raw);
  }

  const out = sql.replace(MASTER_RE, (m, lineComment, blockComment, sq, dq, bt, num, ident) => {
    if (lineComment !== undefined) return opts.comment ? '-- [redacted]' : m;
    if (blockComment !== undefined) return opts.comment ? '/* [redacted] */' : m;
    if (sq !== undefined) return opts.string ? stringFor(m) : m;
    if (dq !== undefined) return opts.ident ? '"' + identFor(m.slice(1, -1)) + '"' : m;
    if (bt !== undefined) return opts.ident ? '`' + identFor(m.slice(1, -1)) + '`' : m;
    if (num !== undefined) return opts.number ? numberFor(m) : m;
    if (ident !== undefined) {
      if (KEYWORDS.has(ident.toLowerCase())) return m;
      return opts.ident ? identFor(ident) : m;
    }
    return m;
  });

  return { out, identMap, stringMap, numberMap };
}

function run() {
  const src = $('input').value;
  const opts = {
    ident: $('optIdent').checked,
    string: $('optString').checked,
    number: $('optNumber').checked,
    comment: $('optComment').checked,
  };
  if (!src.trim()) {
    $('output').textContent = '';
    $('mapping').textContent = '';
    return;
  }
  const { out, identMap, stringMap, numberMap } = obfuscate(src, opts);
  $('output').textContent = out;

  const lines = [];
  if (identMap.size) {
    lines.push('-- identifiers');
    identMap.forEach((v, k) => lines.push(`${k}  →  ${v}`));
  }
  if (stringMap.size) {
    lines.push('', '-- string literals');
    stringMap.forEach((v, k) => lines.push(`${k}  →  ${v}`));
  }
  if (numberMap.size) {
    lines.push('', '-- numeric literals');
    numberMap.forEach((v, k) => lines.push(`${k}  →  ${v}`));
  }
  $('mapping').textContent = lines.join('\n') || '(nothing obfuscated yet)';
}

document.querySelectorAll('.ts-card input[type="checkbox"]').forEach(el => el.addEventListener('change', run));
$('input').addEventListener('input', run);
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));

$('input').value = `SELECT customers.email, orders.total
FROM customers
JOIN orders ON orders.customer_id = customers.id
WHERE customers.country = 'US' AND orders.total > 100
ORDER BY orders.total DESC
LIMIT 10;`;
run();
