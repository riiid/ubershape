import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { SelectEnum, SelectRecord, SelectRoot, SelectUnion } from "./ast.ts";
import { parse } from "./subshape.ts";

Deno.test("use", () => {
  const result = parse(`
    use './foo.ubershape'
  `);
  const useStatement = result.ast.use;
  assertEquals(useStatement.kind, "use");
  assertEquals(useStatement.ubershapePath.text, "./foo.ubershape");
});

Deno.test("select root", () => {
  const result = parse(`
    use './foo.ubershape'

    select root
      > a
      > b[]
  `);

  const selectRootStatement = result.ast.selects[0] as SelectRoot;
  assertEquals(selectRootStatement.kind, "select-root");
  assertEquals(selectRootStatement.typeSelectors.length, 2);
  const typeSelectors = selectRootStatement.typeSelectors;
  assertSelectors(typeSelectors, [
    { type: { text: "a" } },
    { type: { text: "b" }, multiple: true },
  ] as any);
});

Deno.test("select record", () => {
  const result = parse(`
    use './foo.ubershape'

    select record foo {
      a
      b
    }
  `);

  const selectRootStatement = result.ast.selects[0] as SelectRecord;
  assertEquals(selectRootStatement.kind, "select-record");
  assertEquals(selectRootStatement.fieldSelectors.length, 2);
  const fieldSelectors = selectRootStatement.fieldSelectors;
  assertSelectors(fieldSelectors, [
    { fieldName: { text: "a" } },
    { fieldName: { text: "b" } },
  ] as any);
});

Deno.test("select union", () => {
  const result = parse(`
    use './foo.ubershape'

    select union foo
      | a
      | b[]
  `);

  const selectUnionStatement = result.ast.selects[0] as SelectUnion;
  assertEquals(selectUnionStatement.kind, "select-union");
  assertEquals(selectUnionStatement.typeSelectors.length, 2);
  const typeSelectors = selectUnionStatement.typeSelectors;
  assertSelectors(typeSelectors, [
    { type: { text: "a" } },
    { type: { text: "b" }, multiple: true },
  ] as any);
});

Deno.test("select enum", () => {
  const result = parse(`
    use './foo.ubershape'

    select enum foo
      | #a
      | #b
  `);

  const selectEnumStatement = result.ast.selects[0] as SelectEnum;
  assertEquals(selectEnumStatement.kind, "select-enum");
  assertEquals(selectEnumStatement.valueSelectors.length, 2);
  const valueSelectors = selectEnumStatement.valueSelectors;
  assertSelectors(valueSelectors, [
    { valueName: { text: "a" } },
    { valueName: { text: "b" } },
  ] as any);
});

function assertSelectors(actual: any[], expected: any[]): void {
  const len = Math.max(actual.length, expected.length);
  for (let i = 0; i < len; ++i) assertObjectMatch(actual[i], expected[i]);
}
