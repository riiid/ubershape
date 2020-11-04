export interface RecursiveDescentParser {
  loc: number;
  offsetToColRow: (offset: number) => ColRow;
  getAroundText: (loc: number, length?: number, window?: number) => string;
  accept(pattern: string | RegExp): Token | undefined;
  expect(pattern: string | RegExp): Token;
}
export interface RecursiveDescentParserConfig {
  debug: boolean;
}
export interface Span {
  start: number;
  end: number;
}
export interface ColRow {
  col: number;
  row: number;
}
export interface Token extends Span {
  text: string;
}
export function createRecursiveDescentParser(
  input: string,
  config?: Partial<RecursiveDescentParserConfig>
): RecursiveDescentParser {
  const debug = !!config?.debug;
  let cnt = 0;
  const lines = input.split('\n');
  const parser: RecursiveDescentParser = {
    loc: 0,
    offsetToColRow: offset => offsetToColRow(lines, offset),
    getAroundText: (loc, length, window) => getAroundText(
      lines,
      loc,
      length,
      window
    ),
    accept(pattern) {
      cnt++;
      if (cnt > input.length * 5) throw `infinite loop`;
      if (typeof pattern === 'string') {
        return acceptString(pattern);
      } else {
        return acceptRegex(pattern);
      }
    },
    expect(pattern) {
      const result = parser.accept(pattern);
      if (result == null) {
        const colRow = parser.offsetToColRow(parser.loc);
        throw (
          `expected "${pattern}" at ${colRow.row + 1}:${colRow.col + 1}\n` +
          parser.getAroundText(parser.loc)
        );
      } else {
        return result;
      }
    },
  };
  function acceptString(pattern: string): Token | undefined {
    const start = parser.loc;
    const end = start + pattern.length;
    const text = input.slice(start, end);
    if (text !== pattern) return;
    parser.loc = end;
    debug && console.log(text);
    return { start, end, text };
  }
  function acceptRegex(pattern: RegExp): Token | undefined {
    pattern.lastIndex = 0;
    const execArray = pattern.exec(input.substr(parser.loc));
    if (execArray == null) return;
    const text = execArray[0];
    const start = parser.loc + execArray.index;
    const end = start + text.length;
    parser.loc = end;
    debug && console.log(text);
    return { start, end, text };
  }
  return parser;
}

function offsetToColRow(lines: string[], offset: number) {
  let col = offset;
  let row = 0;
  for (const line of lines) {
    const len = line.length + 1;
    if (len < col) {
      col -= len;
      row++;
      continue;
    }
    return { col, row };
  }
  return { col: 0, row };
}

function getAroundText(
  lines: string[],
  loc: number,
  length: number = 1,
  window: number = 5
) {
  const colRow = offsetToColRow(lines, loc);
  const headCount = Math.min(1, (window >> 1) + (window % 2));
  const tailCount = window >> 1;
  const headStart = Math.max(0, colRow.row - headCount - 1);
  const headEnd = colRow.row + 1;
  const tailStart = colRow.row + 1;
  const tailEnd = colRow.row + tailCount + 1;
  const heads = lines.slice(headStart, headEnd);
  const tails = lines.slice(tailStart, tailEnd);
  const lineNumberDigitCount = tailEnd.toString().length;
  const headTexts = heads.map((line, index) => {
    const lineNumber = index + headStart + 1;
    const lineNumberText = lineNumber.toString().padStart(lineNumberDigitCount + 1);
    return lineNumberText + ' | ' + line + '\n';
  }).join('');
  const tailTexts = tails.map((line, index) => {
    const lineNumber = index + tailStart + 1;
    const lineNumberText = lineNumber.toString().padStart(lineNumberDigitCount + 1);
    return lineNumberText + ' | ' + line + '\n';
  }).join('');
  return (
    headTexts +
    (new Array(lineNumberDigitCount + 1 + 1)).join(' ') + ' | ' +
    (new Array(colRow.col + 1)).join(' ') +
    (new Array(length + 1)).join('^') + '\n' +
    tailTexts
  );
}
