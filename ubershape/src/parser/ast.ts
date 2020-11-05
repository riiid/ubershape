import { Span, Token } from './recursive-descent-parser';

export interface UbershapeAst {
  defs: Def[];
}

export interface SubshapeAst {
  use: Use;
  selects: Select[];
}

export interface Statement<T> extends Span {
  kind: T;
}

export type Def =
  | Record
  | Union
;

export interface Record extends Statement<'record'> {
  comments: Token[];
  name: Token;
  fields: Field[];
}

export interface Field extends Span {
  comments: Token[];
  name: Token;
  type: Type;
}

export interface Union extends Statement<'union'> {
  comments: Token[];
  name: Token;
  types: Type[];
}

export interface Type extends Span {
  type: Token;
  multiple: boolean;
}

export interface Use extends Statement<'use'> {
  comments: Token[];
  ubershapePath: Token;
}

export type Select =
  | SelectRecord
  | SelectUnion
;

export interface SelectRecord extends Statement<'select-record'> {
  comments: Token[];
  typeName: Token;
  fieldSelectors: FieldSelector[];
}

export interface SelectUnion extends Statement<'select-union'> {
  comments: Token[];
  typeName: Token;
  typeSelectors: TypeSelector[];
}

export interface FieldSelector extends Span {
  comments: Token[];
  fieldName: Token;
}

export type TypeSelector = Type;
