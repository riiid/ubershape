import { DeepPartial } from '../misc/type';
import { Field, Record, Root, Type, Union } from './ast';
import { parse } from './ubershape';

test('root 1', () => {
  parse(`
    root
  `);
});

test('root 2', () => {
  parse(`
    root
      > foo
  `);
});

test('root 3', () => {
  const result = parse(`
    root
      > a
      > b[]
  `);
  const firstDef = result.ast.defs[0] as Root;
  expect(firstDef.kind).toBe('root');
  expect(firstDef.types.length).toBe(2);
  const types = firstDef.types;
  expect(types).toMatchObject<DeepPartial<Type>[]>([
    { type: { text: 'a', } },
    { type: { text: 'b', }, multiple: true },
  ]);
});

test('record 1', () => {
  parse(`
    record foo {}
  `);
});

test('record 2', () => {
  parse(`
    record foo {
      a: boolean
    }
  `);
});

test('record 3', () => {
  const result = parse(`
    record foo {
      a: boolean
      b: number
      c: string
    }
  `);
  const firstDef = result.ast.defs[0] as Record;
  expect(firstDef.kind).toBe('record');
  expect(firstDef.name.text).toBe('foo');
  expect(firstDef.fields.length).toBe(3);
  const fields = firstDef.fields;
  expect(fields).toMatchObject<DeepPartial<Field>[]>([
    { name: { text: 'a', }, type: { type: { text: 'boolean', } } },
    { name: { text: 'b', }, type: { type: { text: 'number', } } },
    { name: { text: 'c', }, type: { type: { text: 'string', } } },
  ]);
});

test('union 1', () => {
  parse(`
    union foo
  `);
});

test('union 2', () => {
  parse(`
    union foo
      | boolean
  `);
});

test('union 3', () => {
  const result = parse(`
    union foo
      | boolean
      | number
      | string
  `);
  const firstDef = result.ast.defs[0] as Union;
  expect(firstDef.kind).toBe('union');
  expect(firstDef.name.text).toBe('foo');
  const types = firstDef.types;
  expect(types).toMatchObject<DeepPartial<Type>[]>([
    { type: { text: 'boolean' } },
    { type: { text: 'number' } },
    { type: { text: 'string' } },
  ]);
});
