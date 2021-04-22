import { assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { parse } from "./parser/ubershape.ts";
import {
  UbershapeDefDuplicateEnumValueError,
  UbershapeDefDuplicateTypeError,
  UbershapeDuplicateDefError,
  UbershapeEmptyDefError,
  UbershapeRecordDuplicateFieldNameError,
  UbershapeReferenceError,
  UbershapeRootNotExistError,
  validateUbershape,
} from "./ubershape.ts";

Deno.test("validate", () => {
  expectError(
    "union foo",
    UbershapeRootNotExistError,
    1,
  );
});

Deno.test("validate", () => {
  expectError("root", UbershapeEmptyDefError, 1);
  expectError("enum foo", UbershapeEmptyDefError, 1);
  expectError("union foo", UbershapeEmptyDefError, 1);
  expectError("record foo {}", UbershapeEmptyDefError, 1);
});

Deno.test("validate", () => {
  expectError(
    `
      union foo
      record foo {}
    `,
    UbershapeDuplicateDefError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    `
      enum foo
        | #bar
        | #bar
    `,
    UbershapeDefDuplicateEnumValueError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    `
      union foo
        | bar
        | bar
    `,
    UbershapeDefDuplicateTypeError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    `
      record foo {
        bar: boolean
        bar: number
      }
    `,
    UbershapeRecordDuplicateFieldNameError,
    1,
  );
});

Deno.test("validate", () => {
  expectError(
    `
      record foo {
        bar: baz
      }
    `,
    UbershapeReferenceError,
    1,
  );
});

function getValidationErrors(text: string) {
  const parseResult = parse(text);
  return validateUbershape(parseResult.ast);
}

type ErrorClass = { new (...args: any[]): Error };

function expectError(ubershapeCode: string, Error: ErrorClass, count: number) {
  const errors = getValidationErrors(ubershapeCode);
  const actualCount = errors.filter((err) => err instanceof Error).length;
  assertEquals(actualCount, count);
}
