import { Def, Enum, EnumValue, Field, Record, Root, Type, UbershapeAst, Union } from './ast';
import { createRecursiveDescentParser, eof, RecursiveDescentParser, Token } from './recursive-descent-parser';
import { kebabCasePattern, parseType, parseWhitespace } from './shared';

export interface ParseResult {
  ast: UbershapeAst;
  parser: RecursiveDescentParser;
}
export function parse(text: string): ParseResult {
  const parser = createRecursiveDescentParser(text);
  const defs: Def[] = [];
  while (true) {
    const comments = parseWhitespace(parser);
    const root = parseRoot(parser, comments);
    if (root) {
      defs.push(root);
      continue;
    }
    const enumDef = parseEnum(parser, comments);
    if (enumDef) {
      defs.push(enumDef);
      continue;
    }
    const unionDef = parseUnion(parser, comments);
    if (unionDef) {
      defs.push(unionDef);
      continue;
    }
    const recordDef = parseRecord(parser, comments);
    if (recordDef) {
      defs.push(recordDef);
      continue;
    }
    break;
  }
  parser.expect(
    eof,
    ['enum', 'union', 'record'],
    [kebabCasePattern]
  );
  return {
    ast: {
      defs,
    },
    parser,
  };
}

function parseRoot(parser: RecursiveDescentParser, comments: Token[]): Root | undefined {
  const keyword = parser.accept('root');
  if (!keyword) return;
  const types: Type[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept('>')) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const type = parseType(parser, true);
    types.push(type);
  }
  return {
    kind: 'root',
    start: keyword.start,
    end: (types[types.length - 1] ?? keyword).end,
    comments,
    types,
  };
}

function parseEnum(parser: RecursiveDescentParser, comments: Token[]): Enum | undefined {
  const keyword = parser.accept('enum');
  if (!keyword) return;
  parseWhitespace(parser);
  const name = parser.expect(kebabCasePattern);
  const values: EnumValue[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept('|')) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const sharp = parser.expect('#');
    const name = parser.expect(kebabCasePattern);
    values.push({ start: sharp.start, end: name.end, name });
  }
  return {
    kind: 'enum',
    start: keyword.start,
    end: (values[values.length - 1] ?? name).end,
    comments,
    name,
    values,
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

function parseRecord(parser: RecursiveDescentParser, comments: Token[]): Record | undefined {
  const keyword = parser.accept('record');
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
    kind: 'record',
    start: keyword.start,
    end: closeBracket.end,
    comments,
    name,
    fields,
  };
}
