import { SubshapeAst, UbershapeAst } from "./parser/ast.ts";

export const enum SchemaType {
  Ubershape,
  Subshape,
}

export type Schema =
  | UbershapeSchema
  | SubshapeSchema;

interface SchemaBase<T extends SchemaType> {
  kind: T;
  name: string;
  shape: UbershapeAst;
}

export interface UbershapeSchema extends SchemaBase<SchemaType.Ubershape> {}

export interface SubshapeSchema extends SchemaBase<SchemaType.Subshape> {
  ubershape: UbershapeSchema;
  subshapeAst: SubshapeAst;
}
