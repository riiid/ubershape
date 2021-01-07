import { Def, EnumValue, EnumValueSelector, Field, FieldSelector, Select, SelectRoot, SubshapeAst, Type, TypeSelector, UbershapeAst } from './parser/ast';
import { Span } from './parser/recursive-descent-parser';
import { findDefByType, getDefTable, getRoot, UbershapeDefTable, UbershapeRootNotExistError } from './ubershape';

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
): SubshapeValidationError[] {
  const result: SubshapeValidationError[] = [];
  validateSubshapePass1(ubershapeAst, subshapeAst, result);
  validateSubshapePass2(ubershapeAst, subshapeAst, result);
  return result;
}
/**
 * 없는 참조를 선택하고 있지는 않은지 검사하는 패스
 */
function validateSubshapePass1(
  ubershapeAst: UbershapeAst,
  subshapeAst: SubshapeAst,
  result: SubshapeValidationError[]
): void {
  const ubershapeDefTable = getDefTable(ubershapeAst);
  const findDefBySelect = getFindDefBySelect(ubershapeAst, ubershapeDefTable);
  for (const select of subshapeAst.selects) {
    const def = findDefBySelect(select);
    if (def == null) {
      result.push(new SubshapeSelectReferenceError(select));
      continue;
    }
    if (isSelectOfFieldSelectors(select)) {
      const _def = def as { fields: Field[] };
      for (const fieldSelector of select.fieldSelectors) {
        const fieldNameText = fieldSelector.fieldName.text;
        const field = _def.fields.find(field => field.name.text === fieldNameText);
        if (field == null) {
          result.push(new SubshapeFieldSelectorReferenceError(def, fieldSelector));
        }
      }
    } else if (isSelectOfTypeSelectors(select)) {
      const _def = def as { types: Type[] };
      for (const typeSelector of select.typeSelectors) {
        const typeText = typeSelector.type.text;
        const type = _def.types.find(type => type.type.text === typeText);
        if (type == null) {
          result.push(new SubshapeTypeSelectorReferenceError(def, typeSelector));
        }
      }
    } else if (isSelectOfEnumValueSelectors(select)) {
      const _def = def as { values: EnumValue[] };
      for (const valueSelector of select.valueSelectors) {
        const valueNameText = valueSelector.valueName.text;
        const value = _def.values.find(value => value.name.text === valueNameText);
        if (value == null) {
          result.push(new SubshapeValueSelectorReferenceError(def, valueSelector));
        }
      }
    }
  }
}
/**
 * 필요한데 선택하지 않은건 없는지,
 * 안 필요한데 선택한건 없는지 검사하는 패스
 */
function validateSubshapePass2(
  ubershapeAst: UbershapeAst,
  subshapeAst: SubshapeAst,
  result: SubshapeValidationError[]
): void {
  const selectRoot = getSelectRoot(subshapeAst);
  if (selectRoot == null) {
    const root = getRoot(ubershapeAst);
    if (root) result.push(new SubshapeSelectRequiredError(root));
    return;
  }
  const notVisitedSelects = new Set(
    subshapeAst.selects.filter(select => select.kind !== 'select-root')
  );
  interface SelectRequest {
    requiredTypeName: string;
    selector?: TypeSelector | FieldSelector | EnumValueSelector;
  }
  const selectRequests: SelectRequest[] = selectRoot.typeSelectors.map(
    typeSelector => ({ requiredTypeName: typeSelector.type.text })
  );
  const ubershapeDefTable = getDefTable(ubershapeAst);
  const subshapeSelectTable = getSelectTable(subshapeAst);
  let currSelectRequest: SelectRequest | undefined;
  while (currSelectRequest = selectRequests.pop()) {
    const { requiredTypeName, selector } = currSelectRequest;
    const def = ubershapeDefTable[requiredTypeName];
    const select = subshapeSelectTable[requiredTypeName];
    if (select == null) {
      if (def != null) {
        result.push(new SubshapeSelectRequiredError(def, selector));
      } // else cases are already handled by pass1
      continue;
    }
    notVisitedSelects.delete(select);
    if (isSelectOfFieldSelectors(select)) {
      const _def = def as { fields: Field[] };
      for (const fieldSelector of select.fieldSelectors) {
        const fieldNameText = fieldSelector.fieldName.text;
        const field = _def.fields.find(field => field.name.text === fieldNameText);
        if (field == null) continue; // already handled by pass1
        selectRequests.push({
          requiredTypeName: field.type.type.text,
          selector: fieldSelector,
        });
      }
    } else if (isSelectOfTypeSelectors(select)) {
      for (const typeSelector of select.typeSelectors) {
        selectRequests.push({
          requiredTypeName: typeSelector.type.text,
          selector: typeSelector,
        });
      }
    }
  }
  for (const notVisitedSelect of notVisitedSelects) {
    result.push(new SubshapeOrphanSelectError(notVisitedSelect));
  }
}
function getFindDefBySelect(
  ubershapeAst: UbershapeAst,
  ubershapeDefTable: UbershapeDefTable = getDefTable(ubershapeAst)
): (select: Select) => Def | undefined {
  return (select: Select) => {
    if (select.kind === 'select-root') return getRoot(ubershapeAst);
    return ubershapeDefTable[select.typeName.text];
  };
}
function isSelectOfFieldSelectors(select: Select): select is Select & { fieldSelectors: FieldSelector[] } {
  return 'fieldSelectors' in select;
}
function isSelectOfTypeSelectors(select: Select): select is Select & { typeSelectors: TypeSelector[] } {
  return 'typeSelectors' in select;
}
function isSelectOfEnumValueSelectors(select: Select): select is Select & { valueSelectors: EnumValueSelector[] } {
  return 'valueSelectors' in select;
}

function getSelectRoot(ast: SubshapeAst): SelectRoot | undefined {
  for (const select of ast.selects) if (select.kind === 'select-root') return select;
}
interface SubshapeSelectTable {
  [typeName: string]: Select;
}
function getSelectTable(ast: SubshapeAst): SubshapeSelectTable {
  const result: SubshapeSelectTable = {};
  for (const select of ast.selects) {
    if (select.kind === 'select-root') continue;
    result[select.typeName.text] = select;
  }
  return result;
}

export type SubshapeValidationError =
  | SubshapeSelectReferenceError
  | SubshapeOrphanSelectError
  | SubshapeSelectRequiredError
  | SubshapeFieldSelectorReferenceError
  | SubshapeTypeSelectorReferenceError
  | SubshapeValueSelectorReferenceError
;

export { ErrorType as SubshapeValidationErrorType }
const enum ErrorType {
  SelectReference,
  OrphanSelect,
  SelectRequired,
  FieldSelectorReference,
  TypeSelectorReference,
  ValueSelectorReference,
}

export { ErrorBase as SubshapeValidationErrorBase }
abstract class ErrorBase<TErrorType extends ErrorType> extends Error {
  constructor(public errorType: TErrorType) {
    super();
  }
}

export class SubshapeSelectReferenceError extends ErrorBase<ErrorType.SelectReference> {
  constructor(public select: Select) {
    super(ErrorType.SelectReference);
  }
}

export class SubshapeOrphanSelectError extends ErrorBase<ErrorType.OrphanSelect> {
  constructor(public select: Select) {
    super(ErrorType.OrphanSelect);
  }
}

export class SubshapeSelectRequiredError extends ErrorBase<ErrorType.SelectRequired> {
  /**
   * @param selector 어디에서 참조됐기 때문에 해당 타입에 대한 Select가 필요한지를 알려주기 위한 정보입니다.
   */
  constructor(public def: Def, public selector?: TypeSelector | FieldSelector | EnumValueSelector) {
    super(ErrorType.SelectRequired);
  }
}

export class SubshapeFieldSelectorReferenceError extends ErrorBase<ErrorType.FieldSelectorReference> {
  constructor(public def: Def, public fieldSelector: FieldSelector) {
    super(ErrorType.FieldSelectorReference);
  }
}

export class SubshapeTypeSelectorReferenceError extends ErrorBase<ErrorType.TypeSelectorReference> {
  constructor(public def: Def, public typeSelector: TypeSelector) {
    super(ErrorType.TypeSelectorReference);
  }
}

export class SubshapeValueSelectorReferenceError extends ErrorBase<ErrorType.ValueSelectorReference> {
  constructor(public def: Def, public valueSelector: EnumValueSelector) {
    super(ErrorType.ValueSelectorReference);
  }
}
