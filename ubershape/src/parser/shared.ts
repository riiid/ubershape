import { RecursiveDescentParser, Token } from './recursive-descent-parser';

export const whitespacePattern = /^\s+/;
export const kebabCasePattern = /^[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*/;
export const multilineCommentPattern = /^\/\*(?:.|\r?\n)*\*\//;
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
