import { Def, EnumValueSelector, FieldSelector, Select, SubshapeAst, TypeSelector, UbershapeAst } from './parser/ast';
import { Span } from './parser/recursive-descent-parser';
import { findDefByType, getRoot, UbershapeRootNotExistError } from './ubershape';

export function applySubshape(
  ubershapeAst: UbershapeAst,
  subshapeAst: SubshapeAst
): UbershapeAst {
  const usedSet: Set<Span> = new Set();
  for (const select of subshapeAst.selects) {
    if (select.kind === 'select-root') {
      const root = getRoot(ubershapeAst);
      if (!root) throw new UbershapeRootNotExistError();
      usedSet.add(root);
      for (const typeSelector of select.typeSelectors) {
        const type = root.types.find(type => {
          return (
            (type.type.text === typeSelector.type.text) &&
            (type.multiple === typeSelector.multiple)
          );
        });
        if (!type) throw new SubshapeTypeSelectorReferenceError(root, typeSelector);
        usedSet.add(type);
      }
      continue;
    }
    const def = findDefByType(ubershapeAst, select.typeName.text);
    if (!def) throw new SubshapeSelectReferenceError(select);
    usedSet.add(def);
    if (select.kind === 'select-record') {
      if (def.kind !== 'record') throw new SubshapeSelectReferenceError(select);
      for (const fieldSelector of select.fieldSelectors) {
        const fieldName = fieldSelector.fieldName.text;
        const field = def.fields.find(field => field.name.text === fieldName);
        if (!field) throw new SubshapeFieldSelectorReferenceError(def, fieldSelector);
        usedSet.add(field);
      }
      continue;
    }
    if (select.kind === 'select-union') {
      if (def.kind !== 'union') throw new SubshapeSelectReferenceError(select);
      for (const typeSelector of select.typeSelectors) {
        const type = def.types.find(type => {
          return (
            (type.type.text === typeSelector.type.text) &&
            (type.multiple === typeSelector.multiple)
          );
        });
        if (!type) throw new SubshapeTypeSelectorReferenceError(def, typeSelector);
        usedSet.add(type);
      }
      continue;
    }
    if (select.kind === 'select-enum') {
      if (def.kind !== 'enum') throw new SubshapeSelectReferenceError(select);
      for (const valueSelector of select.valueSelectors) {
        const value = def.values.find(
          value => value.name.text === valueSelector.valueName.text
        );
        if (!value) throw new SubshapeValueSelectorReferenceError(def, valueSelector);
        usedSet.add(value);
      }
      continue;
    }
  }
  return {
    defs: ubershapeAst.defs.filter(
      def => usedSet.has(def)
    ).map(def => {
      switch (def.kind) {
        case 'root':
          return {
            ...def,
            types: def.types.filter(type => usedSet.has(type)),
          };
        case 'record':
          return {
            ...def,
            fields: def.fields.filter(field => usedSet.has(field)),
          };
        case 'union':
          return {
            ...def,
            types: def.types.filter(type => usedSet.has(type)),
          };
        case 'enum':
          return {
            ...def,
            values: def.values.filter(value => usedSet.has(value)),
          };
      }
    }),
  };
}

export function validateSubshape(
  ubershapeAst: UbershapeAst,
  subshapeAst: SubshapeAst
): Error[] {
  const result: Error[] = [];
  // TODO
  return result;
}

export class SubshapeSelectReferenceError extends Error {
  constructor(public select: Select) {
    super();
  }
}

export class SubshapeOrphanSelectError extends Error {
  constructor(public select: Select) {
    super();
  }
}

export class SubshapeSelectRequiredError extends Error {
  constructor(public def: Def, public selector: TypeSelector | FieldSelector) {
    super();
  }
}

export class SubshapeFieldSelectorReferenceError extends Error {
  constructor(public def: Def, public fieldSelector: FieldSelector) {
    super();
  }
}

export class SubshapeTypeSelectorReferenceError extends Error {
  constructor(public def: Def, public typeSelector: TypeSelector) {
    super();
  }
}

export class SubshapeValueSelectorReferenceError extends Error {
  constructor(public def: Def, public valueSelector: EnumValueSelector) {
    super();
  }
}
