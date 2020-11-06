import { Def, Record, Root, Type, UbershapeAst, Union } from './parser/ast';
import { Token } from './parser/recursive-descent-parser';
import { primitiveTypeNames } from './primitive';

export function validateUbershape(ast: UbershapeAst): Error[] {
  const result: Error[] = [];
  const memo: { [key: string]: boolean } = {};
  const roots: Root[] = [];
  for (const def of ast.defs) {
    if (def.kind === 'root') {
      roots.push(def);
    } else {
      if (memo[def.name.text]) {
        result.push(new UbershapeDuplicateDefError(def));
      } else {
        memo[def.name.text] = true;
      }
    }
    switch (def.kind) {
      case 'root': result.push(...validateRoot(ast, def)); break;
      case 'union': result.push(...validateUnion(ast, def)); break;
      case 'record': result.push(...validateRecord(ast, def)); break;
    }
  }
  if (roots.length < 1) {
    result.push(new UbershapeRootNotExistError());
  } else if (roots.length > 1) {
    result.push(new UbershapeTooManyRootError(roots));
  }
  return result;
}

export function findDefByType(ast: UbershapeAst, typeName: string): Def | undefined {
  for (const def of ast.defs) {
    if (def.kind === 'root') continue;
    if (def.name.text === typeName) return def;
  }
}

export function getRoot(ast: UbershapeAst): Root | undefined {
  for (const def of ast.defs) if (def.kind === 'root') return def;
}

export function validateRoot(ast: UbershapeAst, root: Root): Error[] {
  const result: Error[] = [];
  const memo: { [key: string]: boolean } = {};
  if (root.types.length === 0) {
    result.push(new UbershapeEmptyDefError(root));
  }
  for (const type of root.types) {
    const typeText = type.type.text + (type.multiple ? '[]' : '');
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

export function validateUnion(ast: UbershapeAst, union: Union): Error[] {
  const result: Error[] = [];
  const memo: { [key: string]: boolean } = {};
  if (union.types.length === 0) {
    result.push(new UbershapeEmptyDefError(union));
  }
  for (const type of union.types) {
    const typeText = type.type.text + (type.multiple ? '[]' : '');
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

export function validateRecord(ast: UbershapeAst, record: Record): Error[] {
  const result: Error[] = [];
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

export class UbershapeEmptyDefError extends Error {
  constructor(public def: Def) {
    super();
  }
}

export class UbershapeRootNotExistError extends Error {
  constructor() {
    super();
  }
}

export class UbershapeTooManyRootError extends Error {
  constructor(public roots: Root[]) {
    super();
  }
}

export class UbershapeDuplicateDefError extends Error {
  constructor(public def: Def) {
    super();
  }
}

export class UbershapeDefDuplicateTypeError extends Error {
  constructor(public type: Type) {
    super();
  }
}

export class UbershapeRecordDuplicateFieldNameError extends Error {
  constructor(public fieldName: Token) {
    super();
  }
}

export class UbershapeReferenceError extends Error {
  constructor(public type: Type) {
    super();
  }
}
