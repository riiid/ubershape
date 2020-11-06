import { parse as parseUbershape } from './parser/ubershape';
import { parse as parseSubshape } from './parser/subshape';
import { SyntaxError } from './parser/recursive-descent-parser';
import { UbershapeReferenceError, validateUbershape } from './ubershape';

try {
  const ubershapeParseResult = parseUbershape(getUbershapeCode());
  const ubershapeAst = ubershapeParseResult.ast;
  const ubershapeErrors = validateUbershape(ubershapeAst);
  for (const error of ubershapeErrors) {
    if (error instanceof UbershapeReferenceError) {
      console.error(error.type.type.text + ' is not defined\n');
      console.error(
        ubershapeParseResult.parser.getAroundText(
          error.type.start,
          error.type.end - error.type.start
        )
      );
    } else {
      console.error(error);
    }
  }
  const subshapeParseResult = parseSubshape(getSubshapeCode());
  const subshapeAst = subshapeParseResult.ast;
  // console.log(JSON.stringify(ubershapeAst, null, 2));
  // console.log(JSON.stringify(subshapeAst, null, 2));
} catch (err) {
  if (err instanceof SyntaxError) {
    console.error(err.toString());
  } else {
    throw err;
  }
}

function getUbershapeCode() {
  return `
    root
      > section[]
      > block-element[]
      > block-element

    union block-element
      | paragraph
      | table
      | image

    record paragraph {
      margin-top: number
      margin-bottom: number
      children: inline-element[]
    }

    union inline-element
      | text

    record text {
      value: string
      bold: boolean
      italic: boolean
      underline: boolean
      strike: boolean
    }

    record image {
      width: number
      height: number
      src: string
    }
  `;
}

function getSubshapeCode() {
  return `
    use './riiid-rich-text.ubershape'

    select root
      > block-element[]
      > block-element

    select some document
      | block-element[]
      | block-element

    select record paragraph {
      children
    }
  `;
}
