import { Def, Field, Table, Type, UbershapeAst, Union } from './ast';
import { createRecursiveDescentParser, RecursiveDescentParser, Token } from './recursive-descent-parser';
import { kebabCasePattern, parseType, parseWhitespace } from './shared';

export function parse(text: string): UbershapeAst {
  const parser = createRecursiveDescentParser(text);
  const defs: Def[] = [];
  while (true) {
    const comments = parseWhitespace(parser);
    const union = parseUnion(parser, comments);
    if (union) {
      defs.push(union);
      continue;
    }
    const table = parseTable(parser, comments);
    if (table) {
      defs.push(table);
      continue;
    }
    break;
  }
  if (parser.loc < text.length) {
    throw `unexpected "${text.substr(parser.loc, 10)}" at ${parser.loc}`;
  }
  return {
    defs,
  };
}

function parseUnion(parser: RecursiveDescentParser, comments: Token[]): Union | undefined {
  const keyword = parser.accept('union');
  if (!keyword) return;
  parseWhitespace(parser);
  const name = parser.expect(kebabCasePattern);
  const types: Type[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept('|')) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const type = parseType(parser, true);
    types.push(type);
  }
  return {
    kind: 'union',
    start: keyword.start,
    end: (types[types.length - 1] ?? name).end,
    comments,
    name,
    types,
  };
}

function parseTable(parser: RecursiveDescentParser, comments: Token[]): Table | undefined {
  const keyword = parser.accept('table');
  if (!keyword) return;
  parseWhitespace(parser);
  const name = parser.expect(kebabCasePattern);
  const fields: Field[] = [];
  parseWhitespace(parser);
  parser.expect('{');
  while (true) {
    const comments = parseWhitespace(parser);
    const name = parser.accept(kebabCasePattern);
    if (!name) break;
    parseWhitespace(parser);
    parser.expect(':');
    parseWhitespace(parser);
    const type = parseType(parser, true);
    fields.push({
      start: name.start,
      end: type.end,
      comments,
      name,
      type,
    });
  }
  const closeBracket = parser.expect('}');
  return {
    kind: 'table',
    start: keyword.start,
    end: closeBracket.end,
    comments,
    name,
    fields,
  };
}
