import { parse as parseUbershape } from './parser/ubershape';
import { parse as parseSubshape } from './parser/subshape';

// console.log(JSON.stringify(parseUbershape(getUbershapeCode()), null, 2));
console.log(JSON.stringify(parseSubshape(getSubshapeCode()), null, 2));

function getUbershapeCode() {
  return `
    union document
      | section[]
      | block-element[]
      | block-element

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

    select union document
      | block-element[]
      | block-element

    select some document
      | block-element[]
      | block-element

    select record paragraph {
      children
    }
  `;
}
