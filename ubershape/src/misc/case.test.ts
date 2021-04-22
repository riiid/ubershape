import { assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { kebab2camel, kebab2pascal } from "./case.ts";

Deno.test("kebab 2 camel", () => {
  assertEquals(kebab2camel(""), "");
  assertEquals(kebab2camel("hello"), "hello");
  assertEquals(kebab2camel("hello-world"), "helloWorld");
});

Deno.test("kebab 2 pascal", () => {
  assertEquals(kebab2pascal(""), "");
  assertEquals(kebab2pascal("hello"), "Hello");
  assertEquals(kebab2pascal("hello-world"), "HelloWorld");
});
