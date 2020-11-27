import * as fs from 'fs';
import * as path from 'path';
import { Schema } from '../schema';
import { JsAndDts } from '../codegen/js';

export function writeJsAndDts(schema: Schema, outDir: string, jsAndDts: JsAndDts) {
  const jsPath = path.join(outDir, `${schema.name}.js`);
  const dtsPath = path.join(outDir, `${schema.name}.d.ts`);
  fs.writeFileSync(jsPath, jsAndDts.js);
  fs.writeFileSync(dtsPath, jsAndDts.dts);
}
