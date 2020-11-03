export interface RecursiveDescentParser {
  loc: number;
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
export interface Token extends Span {
  text: string;
}
export function createRecursiveDescentParser(
  input: string,
  config?: Partial<RecursiveDescentParserConfig>
): RecursiveDescentParser {
  const debug = !!config?.debug;
  let cnt = 0;
  const parser: RecursiveDescentParser = {
    loc: 0,
    accept(pattern: string | RegExp) {
      cnt++;
      if (cnt > input.length * 5) throw `infinite loop`;
      if (typeof pattern === 'string') {
        return acceptString(pattern);
      } else {
        return acceptRegex(pattern);
      }
    },
    expect(pattern: string | RegExp) {
      const result = parser.accept(pattern);
      if (result == null) {
        throw `unexpected "${input.substr(parser.loc, 10)}" at ${parser.loc}`;
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
