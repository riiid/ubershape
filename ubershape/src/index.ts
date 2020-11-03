import { parse } from './parser/ubershape';

console.log(JSON.stringify(parse(getUbershapeCode()), null, 2));

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

    table paragraph {
      margin-top: number
      margin-bottom: number
      children: inline-element[]
    }

    union inline-element
      | text

    table text {
      value: string
      bold: boolean
      italic: boolean
      underline: boolean
      strike: boolean
    }

    table image {
      width: number
      height: number
      src: string
    }
  `;
}

function getSubshapeCode() {
  return `
    use './riiid-rich-text.ubershape'

    select document {
      block-element[]
      block-element
    }

    select paragraph {
      children
    }
  `;
}
