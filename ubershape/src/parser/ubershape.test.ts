import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { Enum, Record, Root, Union } from "./ast.ts";
import { parse } from "./ubershape.ts";

Deno.test("root 1", () => {
  parse(`
    root
  `);
});

Deno.test("root 2", () => {
  parse(`
    root
      > foo
  `);
});

Deno.test("root 3", () => {
  const result = parse(`
    root
      > a
      > b[]
  `);
  const firstDef = result.ast.defs[0] as Root;
  assertEquals(firstDef.kind, "root");
  assertEquals(firstDef.types.length, 2);
  const types = firstDef.types;
  assertSelectors(types, [
    { type: { text: "a" } },
    { type: { text: "b" }, multiple: true },
  ] as any);
});

Deno.test("record 1", () => {
  parse(`
    record foo {}
  `);
});

Deno.test("record 2", () => {
  parse(`
    record foo {
      a: boolean
    }
  `);
});

Deno.test("record 3", () => {
  const result = parse(`
    record foo {
      a: boolean
      b: number
      c: string
    }
  `);
  const firstDef = result.ast.defs[0] as Record;
  assertEquals(firstDef.kind, "record");
  assertEquals(firstDef.name.text, "foo");
  assertEquals(firstDef.fields.length, 3);
  const fields = firstDef.fields;
  assertSelectors(fields, [
    { name: { text: "a" }, type: { type: { text: "boolean" } } },
    { name: { text: "b" }, type: { type: { text: "number" } } },
    { name: { text: "c" }, type: { type: { text: "string" } } },
  ] as any);
});

Deno.test("union 1", () => {
  parse(`
    union foo
  `);
});

Deno.test("union 2", () => {
  parse(`
    union foo
      | boolean
  `);
});

Deno.test("union 3", () => {
  const result = parse(`
    union foo
      | boolean
      | number
      | string
  `);
  const firstDef = result.ast.defs[0] as Union;
  assertEquals(firstDef.kind, "union");
  assertEquals(firstDef.name.text, "foo");
  const types = firstDef.types;
  assertSelectors(types, [
    { type: { text: "boolean" } },
    { type: { text: "number" } },
    { type: { text: "string" } },
  ] as any);
});

Deno.test("enum 1", () => {
  parse(`
    enum foo
  `);
});

Deno.test("enum 2", () => {
  parse(`
    enum foo
      | #a
  `);
});

Deno.test("enum 3", () => {
  const result = parse(`
    enum foo
      | #a
      | #b
  `);
  const firstDef = result.ast.defs[0] as Enum;
  assertEquals(firstDef.kind, "enum");
  assertEquals(firstDef.name.text, "foo");
  const values = firstDef.values;
  assertSelectors(values, [
    { name: { text: "a" } },
    { name: { text: "b" } },
  ] as any);
});

function assertSelectors(actual: any[], expected: any[]): void {
  const len = Math.max(actual.length, expected.length);
  for (let i = 0; i < len; ++i) assertObjectMatch(actual[i], expected[i]);
}
