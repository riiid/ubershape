import { FieldSelector, Select, SelectRecord, SelectUnion, SubshapeAst, TypeSelector, Use } from './ast';
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
  const selectUnion = parseSelectUnion(parser, comments);
  if (selectUnion) return selectUnion;
  const selectRecord = parseSelectRecord(parser, comments);
  if (selectRecord) return selectRecord;
  throw 'expected union or record';
}

function parseSelectUnion(parser: RecursiveDescentParser, comments: Token[]): SelectUnion | undefined {
  const keyword = parser.accept('union');
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  const typeSelectors: TypeSelector[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept('|')) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const typeSelector = parseType(parser, true);
    typeSelectors.push(typeSelector);
  }
  return {
    kind: 'select-union',
    start: keyword.start,
    end: (typeSelectors[typeSelectors.length - 1] ?? typeName).end,
    comments,
    typeName,
    typeSelectors,
  };
}

function parseSelectRecord(parser: RecursiveDescentParser, comments: Token[]): SelectRecord | undefined {
  const keyword = parser.accept('record');
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  parseWhitespace(parser);
  parser.expect('{');
  const fieldSelectors: FieldSelector[] = [];
  while (true) {
    const comments = parseWhitespace(parser);
    const fieldName = parser.accept(kebabCasePattern);
    if (!fieldName) break;
    fieldSelectors.push({
      start: fieldName.start,
      end: fieldName.end,
      comments,
      fieldName,
    });
  }
  const closeBracket = parser.expect('}');
  return {
    kind: 'select-record',
    start: keyword.start,
    end: closeBracket.end,
    comments,
    typeName,
    fieldSelectors,
  };
}
