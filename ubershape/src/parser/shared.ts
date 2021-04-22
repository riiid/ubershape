import { Type } from "./ast.ts";
import { RecursiveDescentParser, Token } from "./recursive-descent-parser.ts";

export const whitespacePattern = /^\s+/;
export const kebabCasePattern = /^[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*/;
export const multilineCommentPattern = /^\/\*(?:.|\r?\n)*?\*\//;
export const singlelineCommentPattern = /^\/\/.*(?:\r?\n|$)/;

export function parseWhitespace(parser: RecursiveDescentParser) {
  const result: Token[] = [];
  while (true) {
    const whitespace = parser.accept(whitespacePattern);
    if (whitespace) continue;
    const multilineComment = parser.accept(multilineCommentPattern);
    if (multilineComment) {
      result.push(multilineComment);
      continue;
    }
    const singlelineComment = parser.accept(singlelineCommentPattern);
    if (singlelineComment) {
      result.push(singlelineComment);
      continue;
    }
    break;
  }
  return result;
}

export function parseType(parser: RecursiveDescentParser, expect: true): Type;
export function parseType(
  parser: RecursiveDescentParser,
  expect: false,
): Type | undefined;
export function parseType(
  parser: RecursiveDescentParser,
  expect: boolean,
): Type | undefined {
  const type = expect
    ? parser.expect(kebabCasePattern)
    : parser.accept(kebabCasePattern);
  if (!type) return;
  parseWhitespace(parser);
  const multipleStart = parser.accept("[");
  if (multipleStart) {
    parseWhitespace(parser);
    const multipleEnd = parser.expect("]");
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
