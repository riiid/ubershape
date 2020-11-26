import * as path from 'path';
import { Schema, SubshapeSchema, UbershapeSchema } from '../schema';
import { schema2js, JsAndDts } from './js';
import { getReadFunction } from '../read-schema';
import { writeJsAndDts } from './write-file';

const read = getReadFunction();
const ubershapePackageDir = path.resolve(__dirname, '../..');
const generatedDir = path.join(ubershapePackageDir, 'generated');

test('enum', () => {
  const rrtv2 = getRrtv2();
  expect(rrtv2.isHeadingLevel('#h1')).toBe(true);
  expect(rrtv2.isHeadingLevel('#h0')).toBe(false);
});

function getRrtv2() {
  const rrtv2Schema = read('./fixture/riiid-rich-text-v2.ubershape').schema as UbershapeSchema;
  return getGeneratedModule(rrtv2Schema);
}
function getRrtv2Realtor() {
  const rrtv2RealtorSchema = read('./fixture/rrt-v2-realtor.subshape').schema as SubshapeSchema;
  return getGeneratedModule(rrtv2RealtorSchema);
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
