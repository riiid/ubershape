import { parse as parseUbershape } from './parser/ubershape';
import { parse as parseSubshape } from './parser/subshape';
import { SyntaxError } from './parser/recursive-descent-parser';
import { UbershapeReferenceError, validateUbershape } from './ubershape';
import { schema2js } from './codegen/js';
import { SchemaType, SubshapeSchema, UbershapeSchema } from './schema';
import { applySubshape } from './subshape';

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
  const ubershapeSchema: UbershapeSchema = {
    kind: SchemaType.Ubershape,
    name: 'riiid-rich-text',
    shape: ubershapeAst,
  };
  const subshapeSchema: SubshapeSchema = {
    kind: SchemaType.Subshape,
    name: 'kaplan',
    shape: applySubshape(ubershapeAst, subshapeAst),
    ubershape: ubershapeSchema,
    subshapeAst: subshapeAst,
  };
  const { js, dts } = schema2js(subshapeSchema);
  console.log(js);
  console.log(dts);
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
      > inline-element[]

    record section {
      children: block-element[]
    }

    union block-element
      | heading
      | paragraph
      | figure

    union inline-element
      | text
      | math-expression
      | image
      | table

    union math-expression
      | tex

    record heading {
      level: heading-level
      align: text-align
      children: inline-element[]
    }

    record paragraph {
      align: text-align
      numbering: numbering
      indent-level: number
      children: inline-element[]
    }

    record figure {
      element: figure-element
      caption: inline-element[]
    }
    union figure-element
      | image

    record text {
      value: string
      weight: text-weight
      italic: boolean
      underline: boolean
      strike: boolean
      supsub: supsub
    }

    record tex {
      value: string
    }

    record image {
      src: string
    }

    record table {
      head: table-head
      body: table-body
      foot: table-foot
    }
    record table-head {
      rows: table-row[]
    }
    record table-body {
      rows: table-row[]
    }
    record table-foot {
      rows: table-row[]
    }
    record table-row {
      cells: table-cell[]
    }
    record table-cell {
      children: block-element[]
    }

    enum text-weight
      | #w100
      | #w200
      | #w300
      | #w400
      | #w500
      | #w600
      | #w700
      | #w800
      | #w900

    enum text-align
      | #justify
      | #left
      | #center
      | #right

    enum supsub
      | #none
      | #sup
      | #sub

    enum heading-level
      | #h1
      | #h2
      | #h3
      | #h4
      | #h5
      | #h6

    enum numbering
      | #none
      | #disc
      | #decimal
  `;
}

function getSubshapeCode() {
  return `
    use './riiid-rich-text.ubershape'

    select root
      > block-element[]
      > inline-element[]

    select union block-element
      | paragraph

    select union inline-element
      | text
      | image

    select record paragraph {
      align
      children
    }

    select record text {
      value
    }

    select record image {
      src
    }

    select enum text-align
      | #justify
      | #left
      | #center
      | #right
  `;
}
