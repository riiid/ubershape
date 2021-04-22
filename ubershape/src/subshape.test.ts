import { assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { parse as parseUbershape } from "./parser/ubershape.ts";
import { parse as parseSubshape } from "./parser/subshape.ts";
import {
  SubshapeFieldSelectorReferenceError,
  SubshapeOrphanSelectError,
  SubshapeSelectReferenceError,
  SubshapeSelectRequiredError,
  SubshapeTypeSelectorReferenceError,
  SubshapeValueSelectorReferenceError,
  validateSubshape,
} from "./subshape.ts";

const ubershapeSample = `
  root
    > foo
    > bar
    > baz

  union foo
    | foo-a
    | foo-b

  enum bar
    | #bar-a
    | #bar-b

  record baz {
    baz-a: foo
    baz-b: bar
  }
`;

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select root
        > foo
      select union foo
        | foo-a
      select enum bar
        | #bar-a
    `,
    SubshapeOrphanSelectError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select root
        > foo
      select union fooooo
        | foo-a
    `,
    SubshapeSelectReferenceError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
    `,
    SubshapeSelectRequiredError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select record baz {
        baz-c
      }
    `,
    SubshapeFieldSelectorReferenceError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select root
        > fooooo
    `,
    SubshapeTypeSelectorReferenceError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select root
        > bar
      select enum bar
        | #bar-c
    `,
    SubshapeValueSelectorReferenceError,
    1,
  );
});

function getValidationErrors(
  ubershapeCode: string,
  subshapeCode: string,
) {
  const parseUbershapeResult = parseUbershape(ubershapeCode);
  const parseSubshapeResult = parseSubshape(subshapeCode);
  return validateSubshape(parseUbershapeResult.ast, parseSubshapeResult.ast);
}

type ErrorClass = { new (...args: any[]): Error };

function expectError(
  ubershapeCode: string,
  subshapeCode: string,
  Error: ErrorClass,
  count: number,
) {
  const errors = getValidationErrors(ubershapeCode, subshapeCode);
  const actualCount = errors.filter((err) => err instanceof Error).length;
  assertEquals(actualCount, count);
}
