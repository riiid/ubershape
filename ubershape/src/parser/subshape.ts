import { Fragment, Select, SubshapeAst, Use } from './ast';
import { createRecursiveDescentParser, RecursiveDescentParser, Token } from './recursive-descent-parser';
import { kebabCasePattern, parseType, parseWhitespace } from './shared';

export function parse(text: string): SubshapeAst {
  const parser = createRecursiveDescentParser(text);
  const comments = parseWhitespace(parser);
  const use = parseUse(parser, comments);
  const selects: Select[] = [];
  while (true) {
    const comments = parseWhitespace(parser);
    const select = parseSelect(parser, comments);
    if (!select) break;
    selects.push(select);
  }
  if (parser.loc < text.length) {
    throw `unexpected "${text.substr(parser.loc, 10)}" at ${parser.loc}`;
  }
  return {
    use,
    selects,
  };
}

function parseUse(parser: RecursiveDescentParser, comments: Token[]): Use {
  const keyword = parser.expect('use');
  parseWhitespace(parser);
  parser.expect('\'');
  const ubershapePath = parser.expect(/[^']*/);
  const endQuote = parser.expect('\'');
  return {
    kind: 'use',
    start: keyword.start,
    end: endQuote.end,
    comments,
    ubershapePath,
  };
}

function parseSelect(parser: RecursiveDescentParser, comments: Token[]): Select | undefined {
  const keyword = parser.accept('select');
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  parseWhitespace(parser);
  parser.expect('{');
  const fragments: Fragment[] = [];
  while (true) {
    parseWhitespace(parser);
    const fragment = parseType(parser, false);
    if (!fragment) break;
    fragments.push(fragment);
  }
  const closeBracket = parser.expect('}');
  return {
    kind: 'select',
    start: keyword.start,
    end: closeBracket.end,
    comments,
    typeName,
    fragments,
  };
}
