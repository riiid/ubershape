import { assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts";
import { ensureDirSync } from "https://deno.land/std@0.93.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.93.0/path/mod.ts";
import { Schema, SubshapeSchema, UbershapeSchema } from "../schema.ts";
import { JsAndDts, schema2js } from "./js.ts";
import { getReadFunction } from "../io/read-schema.ts";
import { writeJsAndDts } from "../io/write-file.ts";

const read = getReadFunction();
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const fixtureDir = path.resolve(__dirname, "fixture");
const generatedDir = path.resolve(__dirname, "generated");
ensureDirSync(generatedDir);

Deno.test("enum", () => {
  const rrtv2 = getRrtv2();
  assertEquals(rrtv2.isHeadingLevel("#h1"), true);
  assertEquals(rrtv2.isHeadingLevel("#h0"), false);
});

Deno.test("visitor", () => {
  const rrtv2 = getRrtv2();
  const visitor = rrtv2.visitor;
  const jsonText = Deno.readTextFileSync(
    path.join(fixtureDir, "riiid-rich-text-v2.json"),
  );
  const documentSections = JSON.parse(jsonText);
  assertEquals(
    documentSections,
    visitor.visitDocumentSections(visitor, documentSections),
  );
});

function getRrtv2() {
  const rrtv2Schema = readFixture("riiid-rich-text-v2.ubershape")
    .schema as UbershapeSchema;
  return getGeneratedModule(rrtv2Schema);
}
function getRrtv2Realtor() {
  const rrtv2RealtorSchema = readFixture("rrt-v2-realtor.subshape")
    .schema as SubshapeSchema;
  return getGeneratedModule(rrtv2RealtorSchema);
}

function readFixture(fileName: string) {
  return read(path.join(fixtureDir, fileName));
}

function getGeneratedModule(schema: Schema): any {
  const generated = getGeneratedCode(schema);
  const exports = {};
  eval(generated.js);
  return exports;
}

function getGeneratedCode(schema: Schema): JsAndDts {
  const memo = getGeneratedCode.memo;
  if (memo[schema.name]) return memo[schema.name];
  const jsAndDts = schema2js(schema);
  writeJsAndDts(schema, generatedDir, jsAndDts);
  memo[schema.name] = jsAndDts;
  return memo[schema.name];
}
getGeneratedCode.memo = {} as { [schemaName: string]: JsAndDts };
