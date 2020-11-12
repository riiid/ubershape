import { DeepPartial } from '../misc/type';
import { EnumValueSelector, FieldSelector, SelectEnum, SelectRecord, SelectRoot, SelectUnion, TypeSelector } from './ast';
import { parse } from './subshape';

test('use', () => {
  const result = parse(`
    use './foo.ubershape'
  `);
  const useStatement = result.ast.use;
  expect(useStatement.kind).toBe('use');
  expect(useStatement.ubershapePath.text).toBe('./foo.ubershape');
});

test('select root', () => {
  const result = parse(`
    use './foo.ubershape'

    select root
      > a
      > b[]
  `);

  const selectRootStatement = result.ast.selects[0] as SelectRoot;
  expect(selectRootStatement.kind).toBe('select-root');
  expect(selectRootStatement.typeSelectors.length).toBe(2);
  const typeSelectors = selectRootStatement.typeSelectors;
  expect(typeSelectors).toMatchObject<DeepPartial<TypeSelector>[]>([
    { type: { text: 'a', } },
    { type: { text: 'b', }, multiple: true },
  ]);
});

test('select record', () => {
  const result = parse(`
    use './foo.ubershape'

    select record foo {
      a
      b
    }
  `);

  const selectRootStatement = result.ast.selects[0] as SelectRecord;
  expect(selectRootStatement.kind).toBe('select-record');
  expect(selectRootStatement.fieldSelectors.length).toBe(2);
  const fieldSelectors = selectRootStatement.fieldSelectors;
  expect(fieldSelectors).toMatchObject<DeepPartial<FieldSelector>[]>([
    { fieldName: { text: 'a', } },
    { fieldName: { text: 'b', } },
  ]);
});

test('select union', () => {
  const result = parse(`
    use './foo.ubershape'

    select union foo
      | a
      | b[]
  `);

  const selectUnionStatement = result.ast.selects[0] as SelectUnion;
  expect(selectUnionStatement.kind).toBe('select-union');
  expect(selectUnionStatement.typeSelectors.length).toBe(2);
  const typeSelectors = selectUnionStatement.typeSelectors;
  expect(typeSelectors).toMatchObject<DeepPartial<TypeSelector>[]>([
    { type: { text: 'a', } },
    { type: { text: 'b', }, multiple: true },
  ]);
});

test('select enum', () => {
  const result = parse(`
    use './foo.ubershape'

    select enum foo
      | #a
      | #b
  `);

  const selectEnumStatement = result.ast.selects[0] as SelectEnum;
  expect(selectEnumStatement.kind).toBe('select-enum');
  expect(selectEnumStatement.valueSelectors.length).toBe(2);
  const valueSelectors = selectEnumStatement.valueSelectors;
  expect(valueSelectors).toMatchObject<DeepPartial<EnumValueSelector>[]>([
    { valueName: { text: 'a', } },
    { valueName: { text: 'b', } },
  ]);
});
