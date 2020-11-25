import * as fs from 'fs';
import * as path from 'path';
import { parse as parseUbershape } from '../parser/ubershape';
import { parse as parseSubshape } from '../parser/subshape';
import { Schema, SchemaType, SubshapeSchema, UbershapeSchema } from '../schema';
import { applySubshape } from '../subshape';
import { schema2js, JsAndDts } from './js';

test('enum', () => {
  const rrtv2 = getRrtv2();
  expect(rrtv2.isHeadingLevel('#h1')).toBe(true);
  expect(rrtv2.isHeadingLevel('#h0')).toBe(false);
});

function getRrtv2() {
  const rrtv2Schema = getRrtv2Schema();
  return getGeneratedModule(rrtv2Schema);
}
function getRrtv2Realtor() {
  const rrtv2RealtorSchema = getRrtv2RealtorSchema();
  return getGeneratedModule(rrtv2RealtorSchema);
}
function getRrtv2Schema() {
  return getUbershapeSchema('riiid-rich-text-v2.ubershape');
}
function getRrtv2RealtorSchema() {
  const rrtv2Schema = getRrtv2Schema();
  return getSubshapeSchema(rrtv2Schema, 'rrt-v2-realtor.†subshape');
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
  const generated = schema2js(schema);
  memo[schema.name] = generated;
  writeGenerated(schema.name, generated);
  return generated;
}
getGeneratedCode.memo = {} as { [schemaName: string]: JsAndDts };

function getUbershapeSchema(fixtureName: string): UbershapeSchema {
  const ubershapeCode = getFixture(fixtureName);
  const kind = SchemaType.Ubershape;
  const name = path.basename(fixtureName, '.ubershape');
  const shape = parseUbershape(ubershapeCode).ast;
  return { kind, name, shape };
}

function getSubshapeSchema(
  ubershape: UbershapeSchema,
  fixtureName: string
): SubshapeSchema {
  const subshapeCode = getFixture(fixtureName);
  const kind = SchemaType.Subshape;
  const name = path.basename(fixtureName, '.subshape');
  const subshapeAst = parseSubshape(subshapeCode).ast;
  const shape = applySubshape(ubershape.shape, subshapeAst);
  return {
    kind,
    name,
    shape,
    ubershape,
    subshapeAst,
  };
}

const ubershapePackageDir = path.resolve(__dirname, '../..');
function getFixture(fixtureName: string): string {
  return fs.readFileSync(
    path.join(ubershapePackageDir, 'fixture', fixtureName),
    'utf8'
  );
}

function writeGenerated(schemaName: string, generated: JsAndDts) {
  const generatedDir = path.join(ubershapePackageDir, 'generated');
  const jsPath = path.join(generatedDir, `${schemaName}.js`);
  const dtsPath = path.join(generatedDir, `${schemaName}.d.ts`);
  fs.writeFileSync(jsPath, generated.js);
  fs.writeFileSync(dtsPath, generated.dts);
}
