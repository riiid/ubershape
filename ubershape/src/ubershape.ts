import {
  Def,
  Enum,
  EnumValue,
  Record,
  Root,
  Type,
  UbershapeAst,
  Union,
} from "./parser/ast.ts";
import { Token } from "./parser/recursive-descent-parser.ts";
import { primitiveTypeNames } from "./primitive.ts";

export function validateUbershape(
  ast: UbershapeAst,
): UbershapeValidationError[] {
  const result: UbershapeValidationError[] = [];
  const memo: { [key: string]: boolean } = {};
  const roots: Root[] = [];
  for (const def of ast.defs) {
    if (def.kind === "root") {
      roots.push(def);
    } else {
      if (memo[def.name.text]) {
        result.push(new UbershapeDuplicateDefError(def));
      } else {
        memo[def.name.text] = true;
      }
    }
    switch (def.kind) {
      case "root":
        result.push(...validateRoot(ast, def));
        break;
      case "enum":
        result.push(...validateEnum(ast, def));
        break;
      case "union":
        result.push(...validateUnion(ast, def));
        break;
      case "record":
        result.push(...validateRecord(ast, def));
        break;
    }
  }
  if (roots.length < 1) {
    result.push(new UbershapeRootNotExistError());
  } else if (roots.length > 1) {
    result.push(new UbershapeTooManyRootError(roots));
  }
  return result;
}

export interface UbershapeDefTable {
  [typeName: string]: Def;
}
export function getDefTable(ast: UbershapeAst): UbershapeDefTable {
  const result: UbershapeDefTable = {};
  for (const def of ast.defs) {
    if (def.kind === "root") continue;
    result[def.name.text] = def;
  }
  return result;
}

export function findDefByType(
  ast: UbershapeAst,
  typeName: string,
): Def | undefined {
  for (const def of ast.defs) {
    if (def.kind === "root") continue;
    if (def.name.text === typeName) return def;
  }
}

export function getRoot(ast: UbershapeAst): Root | undefined {
  for (const def of ast.defs) if (def.kind === "root") return def;
}

export function validateRoot(
  ast: UbershapeAst,
  root: Root,
): UbershapeValidationError[] {
  const result: UbershapeValidationError[] = [];
  const memo: { [key: string]: boolean } = {};
  if (root.types.length === 0) {
    result.push(new UbershapeEmptyDefError(root));
  }
  for (const type of root.types) {
    const typeText = type.type.text + (type.multiple ? "[]" : "");
    if (memo[typeText]) {
      result.push(new UbershapeDefDuplicateTypeError(type));
    } else {
      memo[typeText] = true;
    }
    if (findDefByType(ast, type.type.text) == null) {
      if (!primitiveTypeNames.includes(type.type.text)) {
        result.push(new UbershapeReferenceError(type));
      }
    }
  }
  return result;
}

export function validateEnum(
  _ast: UbershapeAst,
  enumDef: Enum,
): UbershapeValidationError[] {
  const result: UbershapeValidationError[] = [];
  const memo: { [key: string]: boolean } = {};
  if (enumDef.values.length === 0) {
    result.push(new UbershapeEmptyDefError(enumDef));
  }
  for (const value of enumDef.values) {
    const valueText = "#" + value.name.text;
    if (memo[valueText]) {
      result.push(new UbershapeDefDuplicateEnumValueError(value));
    } else {
      memo[valueText] = true;
    }
  }
  return result;
}

export function validateUnion(
  ast: UbershapeAst,
  union: Union,
): UbershapeValidationError[] {
  const result: UbershapeValidationError[] = [];
  const memo: { [key: string]: boolean } = {};
  if (union.types.length === 0) {
    result.push(new UbershapeEmptyDefError(union));
  }
  for (const type of union.types) {
    const typeText = type.type.text + (type.multiple ? "[]" : "");
    if (memo[typeText]) {
      result.push(new UbershapeDefDuplicateTypeError(type));
    } else {
      memo[typeText] = true;
    }
    if (findDefByType(ast, type.type.text) == null) {
      if (!primitiveTypeNames.includes(type.type.text)) {
        result.push(new UbershapeReferenceError(type));
      }
    }
  }
  return result;
}

export function validateRecord(
  ast: UbershapeAst,
  record: Record,
): UbershapeValidationError[] {
  const result: UbershapeValidationError[] = [];
  const memo: { [key: string]: boolean } = {};
  if (record.fields.length === 0) {
    result.push(new UbershapeEmptyDefError(record));
  }
  for (const field of record.fields) {
    if (memo[field.name.text]) {
      result.push(new UbershapeRecordDuplicateFieldNameError(field.name));
    } else {
      memo[field.name.text] = true;
    }
    if (findDefByType(ast, field.type.type.text) == null) {
      if (!primitiveTypeNames.includes(field.type.type.text)) {
        result.push(new UbershapeReferenceError(field.type));
      }
    }
  }
  return result;
}

export type UbershapeValidationError =
  | UbershapeEmptyDefError
  | UbershapeRootNotExistError
  | UbershapeTooManyRootError
  | UbershapeDuplicateDefError
  | UbershapeDefDuplicateTypeError
  | UbershapeDefDuplicateEnumValueError
  | UbershapeRecordDuplicateFieldNameError
  | UbershapeReferenceError;

export { ErrorType as UbershapeValidationErrorType };
const enum ErrorType {
  EmptyDef,
  RootNotExist,
  TooManyRoot,
  DuplicateDef,
  DefDuplicateType,
  DefDuplicateEnumValue,
  RecordDuplicateFieldName,
  Reference,
}

export { ErrorBase as UbershapeValidationErrorBase };
abstract class ErrorBase<TErrorType extends ErrorType> extends Error {
  constructor(public errorType: TErrorType) {
    super();
  }
}

export class UbershapeEmptyDefError extends ErrorBase<ErrorType.EmptyDef> {
  constructor(public def: Def) {
    super(ErrorType.EmptyDef);
  }
}

export class UbershapeRootNotExistError
  extends ErrorBase<ErrorType.RootNotExist> {
  constructor() {
    super(ErrorType.RootNotExist);
  }
}

export class UbershapeTooManyRootError
  extends ErrorBase<ErrorType.TooManyRoot> {
  constructor(public roots: Root[]) {
    super(ErrorType.TooManyRoot);
  }
}

export class UbershapeDuplicateDefError
  extends ErrorBase<ErrorType.DuplicateDef> {
  constructor(public def: Def) {
    super(ErrorType.DuplicateDef);
  }
}

export class UbershapeDefDuplicateTypeError
  extends ErrorBase<ErrorType.DefDuplicateType> {
  constructor(public type: Type) {
    super(ErrorType.DefDuplicateType);
  }
}

export class UbershapeDefDuplicateEnumValueError
  extends ErrorBase<ErrorType.DefDuplicateEnumValue> {
  constructor(public enumValue: EnumValue) {
    super(ErrorType.DefDuplicateEnumValue);
  }
}

export class UbershapeRecordDuplicateFieldNameError
  extends ErrorBase<ErrorType.RecordDuplicateFieldName> {
  constructor(public fieldName: Token) {
    super(ErrorType.RecordDuplicateFieldName);
  }
}

export class UbershapeReferenceError extends ErrorBase<ErrorType.Reference> {
  constructor(public type: Type) {
    super(ErrorType.Reference);
  }
}
