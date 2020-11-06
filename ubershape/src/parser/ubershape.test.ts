import { DeepPartial } from '../misc/type';
import { Field, Record, Type, Union } from './ast';
import { parse } from './ubershape';

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
  const firstDef = result.ast.defs[0];
  expect(firstDef.kind).toBe('record');
  expect(firstDef.name.text).toBe('foo');
  expect((firstDef as Record).fields.length).toBe(3);
  const fields = (firstDef as Record).fields;
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
  const firstDef = result.ast.defs[0];
  expect(firstDef.kind).toBe('union');
  expect(firstDef.name.text).toBe('foo');
  const types = (firstDef as Union).types;
  expect(types).toMatchObject<DeepPartial<Type>[]>([
    { type: { text: 'boolean' } },
    { type: { text: 'number' } },
    { type: { text: 'string' } },
  ]);
});
