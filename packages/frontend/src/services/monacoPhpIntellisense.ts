type Monaco = typeof import('monaco-editor');

let installed = false;
let disposables: import('monaco-editor').IDisposable[] = [];

const PHP_KEYWORDS = [
  'abstract',
  'and',
  'array',
  'as',
  'break',
  'callable',
  'case',
  'catch',
  'class',
  'clone',
  'const',
  'continue',
  'declare',
  'default',
  'do',
  'echo',
  'else',
  'elseif',
  'empty',
  'enddeclare',
  'endfor',
  'endforeach',
  'endif',
  'endswitch',
  'endwhile',
  'enum',
  'eval',
  'exit',
  'extends',
  'file_get_contents',
  'final',
  'finally',
  'fn',
  'for',
  'foreach',
  'global',
  'goto',
  'if',
  'implements',
  'include',
  'include_once',
  'instanceof',
  'insteadof',
  'interface',
  'isset',
  'list',
  'match',
  'namespace',
  'new',
  'or',
  'print',
  'private',
  'protected',
  'public',
  'readonly',
  'require',
  'require_once',
  'return',
  'static',
  'switch',
  'throw',
  'trait',
  'try',
  'unset',
  'use',
  'var',  
  'while',
  'xor',
  'yield',
  'yield from',
] as const;

type BuiltinDoc = {
  label: string;
  detail: string;
  documentation: string;
};

const PHP_BUILTINS: BuiltinDoc[] = [
  {
    label: 'count',
    detail: 'count(array|Countable $value): int',
    documentation: 'Counts all elements in an array or something in an object.',
  },
  {
    label: 'strlen',
    detail: 'strlen(string $string): int',
    documentation: 'Gets string length.',
  },
  {
    label: 'explode',
    detail: 'explode(string $separator, string $string, int $limit = PHP_INT_MAX): array',
    documentation: 'Splits a string by a string.',
  },
  {
    label: 'implode',
    detail: 'implode(string $separator, array $array): string',
    documentation: 'Joins array elements with a string.',
  },
  {
    label: 'array_map',
    detail: 'array_map(?callable $callback, array $array, array ...$arrays): array',
    documentation: 'Applies the callback to the elements of the given arrays.',
  },
  {
    label: 'array_filter',
    detail: 'array_filter(array $array, ?callable $callback = null, int $mode = 0): array',
    documentation: 'Filters elements of an array using a callback function.',
  },
  {
    label: 'array_reduce',
    detail: 'array_reduce(array $array, callable $callback, mixed $initial = null): mixed',
    documentation: 'Iteratively reduces the array to a single value using a callback function.',
  },
  {
    label: 'sort',
    detail: 'sort(array &$array, int $flags = SORT_REGULAR): bool',
    documentation: 'Sorts an array in ascending order.',
  },
  {
    label: 'usort',
    detail: 'usort(array &$array, callable $callback): bool',
    documentation: 'Sorts an array by values using a user-defined comparison function.',
  },
  {
    label: 'json_encode',
    detail: 'json_encode(mixed $value, int $flags = 0, int $depth = 512): string|false',
    documentation: 'Returns the JSON representation of a value.',
  },
  {
    label: 'json_decode',
    detail: 'json_decode(string $json, bool $assoc = false, int $depth = 512, int $flags = 0): mixed',
    documentation: 'Decodes a JSON string.',
  },
  {
    label: 'preg_match',
    detail: 'preg_match(string $pattern, string $subject, array &$matches = [], int $flags = 0, int $offset = 0): int|false',
    documentation: 'Performs a regular expression match.',
  },
] as const;

const PHP_SNIPPETS = [
  {
    label: 'solution()',
    detail: 'Interview stub',
    insertText: ['function solution() {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'foreach',
    detail: 'Loop over array',
    insertText: ['foreach (${1:$array} as ${2:$value}) {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'if',
    detail: 'Conditional',
    insertText: ['if (${1:condition}) {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'try/catch',
    detail: 'Exception handling',
    insertText: ['try {', '\t$0', '} catch (\\Throwable $e) {', '\t// ...', '}'].join('\n'),
  },
] as const;

type ExtractedSymbols = {
  variables: string[];
  functions: string[];
  classes: string[];
};

const symbolCache = new WeakMap<
  import('monaco-editor').editor.ITextModel,
  { versionId: number; symbols: ExtractedSymbols }
>();

function extractSymbols(model: import('monaco-editor').editor.ITextModel): ExtractedSymbols {
  const cached = symbolCache.get(model);
  const versionId = model.getVersionId();
  if (cached && cached.versionId === versionId) return cached.symbols;

  const text = model.getValue();

  const variablesSet = new Set<string>();
  for (const match of text.matchAll(/\$[a-zA-Z_][a-zA-Z0-9_]*/g)) {
    variablesSet.add(match[0]);
  }

  const functionsSet = new Set<string>();
  for (const match of text.matchAll(/\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) {
    functionsSet.add(match[1]);
  }

  const classesSet = new Set<string>();
  for (const match of text.matchAll(/\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g)) {
    classesSet.add(match[1]);
  }

  const symbols: ExtractedSymbols = {
    variables: [...variablesSet].sort(),
    functions: [...functionsSet].sort(),
    classes: [...classesSet].sort(),
  };

  symbolCache.set(model, { versionId, symbols });
  return symbols;
}

function getTokenRangeIncludingDollar(
  monaco: Monaco,
  model: import('monaco-editor').editor.ITextModel,
  position: import('monaco-editor').Position
): import('monaco-editor').IRange {
  const lineNumber = position.lineNumber;
  const line = model.getLineContent(lineNumber);

  const endColumn = position.column;
  let i = endColumn - 2; // 0-based index of char before cursor

  while (i >= 0 && /[a-zA-Z0-9_]/.test(line[i] ?? '')) i--;
  if (i >= 0 && line[i] === '$') i--;

  const startColumn = i + 2; // convert back to 1-based column
  return new monaco.Range(lineNumber, startColumn, lineNumber, endColumn);
}

function getHoverTokenIncludingDollar(
  model: import('monaco-editor').editor.ITextModel,
  position: import('monaco-editor').Position
): { token: string; range: import('monaco-editor').IRange } | null {
  const line = model.getLineContent(position.lineNumber);
  const idx = position.column - 1; // 0-based

  // Expand [a-zA-Z0-9_], and optionally a leading '$'
  let start = idx;
  while (start > 0 && /[a-zA-Z0-9_]/.test(line[start - 1] ?? '')) start--;
  if (start > 0 && line[start - 1] === '$') start--;

  let end = idx;
  while (end < line.length && /[a-zA-Z0-9_]/.test(line[end] ?? '')) end++;

  const token = line.slice(start, end).trim();
  if (!token.length) return null;

  const range: import('monaco-editor').IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: start + 1, // 1-based
    endColumn: end + 1, // 1-based, exclusive
  };

  return { token, range };
}

function uniqCompletionItems(
  items: import('monaco-editor').languages.CompletionItem[]
): import('monaco-editor').languages.CompletionItem[] {
  const seen = new Set<string>();
  const result: import('monaco-editor').languages.CompletionItem[] = [];

  for (const item of items) {
    const key = typeof item.label === 'string' ? item.label : item.label.label;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function ensurePhpIntellisense(monaco: Monaco): void {
  if (installed) return;
  installed = true;

  const builtinsByLabel = new Map<string, BuiltinDoc>();
  for (const b of PHP_BUILTINS) builtinsByLabel.set(b.label, b);

  disposables.push(
    monaco.languages.registerCompletionItemProvider('php', {
      triggerCharacters: ['$', '\\'],
      provideCompletionItems: (model, position, _context, _token) => {
        const range = getTokenRangeIncludingDollar(monaco, model, position);
        const current = model.getValueInRange(range);
        const currentLower = current.toLowerCase();

        const suggestions: import('monaco-editor').languages.CompletionItem[] = [];

        for (const kw of PHP_KEYWORDS) {
          if (currentLower && !kw.startsWith(currentLower)) continue;
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          });
        }

        for (const b of PHP_BUILTINS) {
          if (currentLower && !b.label.toLowerCase().startsWith(currentLower)) continue;
          suggestions.push({
            label: b.label,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: b.detail,
            documentation: b.documentation,
            insertText: b.label,
            range,
          });
        }

        const symbols = extractSymbols(model);

        for (const v of symbols.variables) {
          if (current && !v.startsWith(current)) continue;
          suggestions.push({
            label: v,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: v,
            range,
          });
        }

        for (const f of symbols.functions) {
          if (currentLower && !f.toLowerCase().startsWith(currentLower)) continue;
          suggestions.push({
            label: f,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: f,
            range,
          });
        }

        for (const c of symbols.classes) {
          if (currentLower && !c.toLowerCase().startsWith(currentLower)) continue;
          suggestions.push({
            label: c,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: c,
            range,
          });
        }

        for (const s of PHP_SNIPPETS) {
          const labelLower = s.label.toLowerCase();
          if (currentLower && !labelLower.startsWith(currentLower)) continue;
          suggestions.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.detail,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        }

        return { suggestions: uniqCompletionItems(suggestions) };
      },
    })
  );

  disposables.push(
    monaco.languages.registerHoverProvider('php', {
      provideHover: (model, position) => {
        const result = getHoverTokenIncludingDollar(model, position);
        if (!result) return null;
        const { token, range } = result;

        const builtin = builtinsByLabel.get(token);
        if (builtin) {
          return {
            range,
            contents: [
              { value: `**${builtin.label}**` },
              { value: `\`${builtin.detail}\`` },
              { value: builtin.documentation },
            ],
          };
        }

        if (token.startsWith('$')) {
          return { range, contents: [{ value: `Variable \`${token}\`` }] };
        }

        return null;
      },
    })
  );
}

export function disposePhpIntellisense(): void {
  for (const d of disposables) d.dispose();
  disposables = [];
  installed = false;
}
