import { createRecursiveDescentParser, RecursiveDescentParser, Span, Token } from './recursive-descent-parser';
import { kebabCasePattern, parseWhitespace } from './shared';

export type UbershapeAst = (Table | Union)[];

export function parse(text: string) {
  const parser = createRecursiveDescentParser(text);
  const ast: UbershapeAst = [];
  while (true) {
    const comments = parseWhitespace(parser);
    const union = parseUnion(parser, comments);
    if (union) {
      ast.push(union);
      continue;
    }
    const table = parseTable(parser, comments);
    if (table) {
      ast.push(table);
      continue;
    }
    break;
  }
  if (parser.loc < text.length) {
    throw `unexpected "${text.substr(parser.loc, 10)}" at ${parser.loc}`;
  }
  return ast;
}

function parseUnion(parser: RecursiveDescentParser, comments: Token[]): Union | undefined {
  if (!parser.accept('union')) return;
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
    const type = parseType(parser);
    types.push(type);
  }
  return {
    kind: 'union',
    start: name.start,
    end: (types[types.length - 1] ?? name).end,
    comments,
    name,
    types,
  };
}

function parseTable(parser: RecursiveDescentParser, comments: Token[]): Table | undefined {
  if (!parser.accept('table')) return;
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
    const type = parseType(parser);
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
    start: name.start,
    end: closeBracket.end,
    comments,
    name,
    fields,
  };
}

function parseType(parser: RecursiveDescentParser): Type {
  const type = parser.expect(kebabCasePattern);
  parseWhitespace(parser);
  const multipleStart = parser.accept('[');
  if (multipleStart) {
    parseWhitespace(parser);
    const multipleEnd = parser.expect(']');
    return {
      start: type.start,
      end: multipleEnd.end,
      type,
      multiple: true,
    };
  } else {
    return {
      start: type.start,
      end: type.end,
      type,
      multiple: false,
    };
  }
}

export interface Def<T> extends Span {
  kind: T;
}

export interface Table extends Def<'table'> {
  comments: Token[];
  name: Token;
  fields: Field[];
}

export interface Field extends Span {
  comments: Token[];
  name: Token;
  type: Type;
}

export interface Union extends Def<'union'> {
  comments: Token[];
  name: Token;
  types: Type[];
}

export interface Type extends Span {
  type: Token;
  multiple: boolean;
}
