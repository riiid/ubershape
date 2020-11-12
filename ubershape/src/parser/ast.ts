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
  | Root
  | Record
  | Union
  | Enum
;

export interface Root extends Statement<'root'> {
  comments: Token[];
  types: Type[];
}

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

export interface Enum extends Statement<'enum'> {
  comments: Token[];
  name: Token;
  values: EnumValue[];
}

export interface EnumValue extends Span {
  name: Token;
}

export interface Use extends Statement<'use'> {
  comments: Token[];
  ubershapePath: Token;
}

export type Select =
  | SelectRoot
  | SelectRecord
  | SelectUnion
  | SelectEnum
;

export interface SelectRoot extends Statement<'select-root'> {
  comments: Token[];
  typeSelectors: TypeSelector[];
}

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

export interface SelectEnum extends Statement<'select-enum'> {
  comments: Token[];
  typeName: Token;
  valueSelectors: EnumValueSelector[];
}

export interface FieldSelector extends Span {
  comments: Token[];
  fieldName: Token;
}

export type TypeSelector = Type;

export interface EnumValueSelector extends Span {
  valueName: Token;
}
