import { kebab2camel, kebab2pascal } from './case';

test('kebab 2 camel', () => {
  expect(kebab2camel('')).toBe('');
  expect(kebab2camel('hello')).toBe('hello');
  expect(kebab2camel('hello-world')).toBe('helloWorld');
});

test('kebab 2 pascal', () => {
  expect(kebab2pascal('')).toBe('');
  expect(kebab2pascal('hello')).toBe('Hello');
  expect(kebab2pascal('hello-world')).toBe('HelloWorld');
});
