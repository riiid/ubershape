import { parse as parseUbershape } from './parser/ubershape';
import { parse as parseSubshape } from './parser/subshape';
import {
  validateSubshape,
  SubshapeOrphanSelectError,
  SubshapeSelectReferenceError,
  SubshapeSelectRequiredError,
  SubshapeFieldSelectorReferenceError,
  SubshapeTypeSelectorReferenceError,
  SubshapeValueSelectorReferenceError,
} from './subshape';

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

test('validate', () => {
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
    1
  );
});

test('validate', () => {
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
    1
  );
});

test('validate', () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
    `,
    SubshapeSelectRequiredError,
    1
  );
});

test('validate', () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select record baz {
        baz-c
      }
    `,
    SubshapeFieldSelectorReferenceError,
    1
  );
});

test('validate', () => {
  expectError(
    ubershapeSample,
    `
      use 'ubershape sample'
      select root
        > fooooo
    `,
    SubshapeTypeSelectorReferenceError,
    1
  );
});

test('validate', () => {
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
    1
  );
});

function getValidationErrors(
  ubershapeCode: string,
  subshapeCode: string
) {
  const parseUbershapeResult = parseUbershape(ubershapeCode);
  const parseSubshapeResult = parseSubshape(subshapeCode);
  return validateSubshape(parseUbershapeResult.ast, parseSubshapeResult.ast);
}

type ErrorClass = { new(...args: any[]): Error };

function expectError(
  ubershapeCode: string,
  subshapeCode: string,
  Error: ErrorClass,
  count: number
) {
  const errors = getValidationErrors(ubershapeCode, subshapeCode);
  const actualCount = errors.filter(err => err instanceof Error).length;
  expect(actualCount).toBe(count);
}
