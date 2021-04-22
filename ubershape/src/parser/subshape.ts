import {
  EnumValueSelector,
  FieldSelector,
  Select,
  SelectEnum,
  SelectRecord,
  SelectRoot,
  SelectUnion,
  SubshapeAst,
  TypeSelector,
  Use,
} from "./ast.ts";
import {
  createRecursiveDescentParser,
  eof,
  RecursiveDescentParser,
  SyntaxError,
  Token,
} from "./recursive-descent-parser.ts";
import { kebabCasePattern, parseType, parseWhitespace } from "./shared.ts";

export interface ParseResult {
  ast: SubshapeAst;
  parser: RecursiveDescentParser;
}
export function parse(text: string): ParseResult {
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
  parser.expect(eof);
  return {
    ast: {
      use,
      selects,
    },
    parser,
  };
}

function parseUse(parser: RecursiveDescentParser, comments: Token[]): Use {
  const keyword = parser.expect("use");
  parseWhitespace(parser);
  parser.expect("'");
  const ubershapePath = parser.expect(/[^']*/);
  const endQuote = parser.expect("'");
  return {
    kind: "use",
    start: keyword.start,
    end: endQuote.end,
    comments,
    ubershapePath,
  };
}

function parseSelect(
  parser: RecursiveDescentParser,
  comments: Token[],
): Select | undefined {
  const keyword = parser.accept("select");
  if (!keyword) return;
  parseWhitespace(parser);
  const selectRoot = parseSelectRoot(parser, comments);
  if (selectRoot) return selectRoot;
  const selectEnum = parseSelectEnum(parser, comments);
  if (selectEnum) return selectEnum;
  const selectUnion = parseSelectUnion(parser, comments);
  if (selectUnion) return selectUnion;
  const selectRecord = parseSelectRecord(parser, comments);
  if (selectRecord) return selectRecord;
  throw new SyntaxError(
    parser,
    ["root", "enum", "union", "record"],
    [kebabCasePattern],
  );
}

function parseSelectRoot(
  parser: RecursiveDescentParser,
  comments: Token[],
): SelectRoot | undefined {
  const keyword = parser.accept("root");
  if (!keyword) return;
  const typeSelectors: TypeSelector[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept(">")) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const typeSelector = parseType(parser, true);
    typeSelectors.push(typeSelector);
  }
  return {
    kind: "select-root",
    start: keyword.start,
    end: (typeSelectors[typeSelectors.length - 1] ?? keyword).end,
    comments,
    typeSelectors,
  };
}

function parseSelectEnum(
  parser: RecursiveDescentParser,
  comments: Token[],
): SelectEnum | undefined {
  const keyword = parser.accept("enum");
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  const valueSelectors: EnumValueSelector[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept("|")) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const sharp = parser.expect("#");
    const valueName = parser.expect(kebabCasePattern);
    valueSelectors.push({ start: sharp.start, end: valueName.end, valueName });
  }
  return {
    kind: "select-enum",
    start: keyword.start,
    end: (valueSelectors[valueSelectors.length - 1] ?? typeName).end,
    comments,
    typeName,
    valueSelectors,
  };
}

function parseSelectUnion(
  parser: RecursiveDescentParser,
  comments: Token[],
): SelectUnion | undefined {
  const keyword = parser.accept("union");
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  const typeSelectors: TypeSelector[] = [];
  while (true) {
    const loc = parser.loc;
    parseWhitespace(parser);
    if (!parser.accept("|")) {
      parser.loc = loc;
      break;
    }
    parseWhitespace(parser);
    const typeSelector = parseType(parser, true);
    typeSelectors.push(typeSelector);
  }
  return {
    kind: "select-union",
    start: keyword.start,
    end: (typeSelectors[typeSelectors.length - 1] ?? typeName).end,
    comments,
    typeName,
    typeSelectors,
  };
}

function parseSelectRecord(
  parser: RecursiveDescentParser,
  comments: Token[],
): SelectRecord | undefined {
  const keyword = parser.accept("record");
  if (!keyword) return;
  parseWhitespace(parser);
  const typeName = parser.expect(kebabCasePattern);
  parseWhitespace(parser);
  parser.expect("{");
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
  const closeBracket = parser.expect("}");
  return {
    kind: "select-record",
    start: keyword.start,
    end: closeBracket.end,
    comments,
    typeName,
    fieldSelectors,
  };
}
