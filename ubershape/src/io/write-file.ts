import * as path from "https://deno.land/std@0.93.0/path/mod.ts";
import { Schema } from "../schema.ts";
import { JsAndDts } from "../codegen/js.ts";

export function writeJsAndDts(
  schema: Schema,
  outDir: string,
  jsAndDts: JsAndDts,
) {
  const jsPath = path.join(outDir, `${schema.name}.js`);
  const dtsPath = path.join(outDir, `${schema.name}.d.ts`);
  Deno.writeTextFileSync(jsPath, jsAndDts.js);
  Deno.writeTextFileSync(dtsPath, jsAndDts.dts);
}
