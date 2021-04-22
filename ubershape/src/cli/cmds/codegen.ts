import { ensureDirSync } from "https://deno.land/std@0.93.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.93.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.18.0/command/mod.ts";
import { schema2js } from "../../codegen/js.ts";
import { writeJsAndDts } from "../../io/write-file.ts";
import { getReadFunction } from "../../io/read-schema.ts";

interface Options {
  out: string;
  target?: string;
}

export default new Command()
  .arguments("<ubershape:string> [subshapes...:string]")
  .description("generate runtime codes from schema files")
  .option("-o, --out <value:string>", "out directory")
  .option("-t, --target <value:string>", "target language", {
    default: "js",
  })
  .action(async (options: Options, ubershape: string, subshapes: string[]) => {
    const outDir = path.resolve(options.out);
    const read = getReadFunction();
    const _ubershape = read(path.resolve(ubershape));
    const _subshapes = subshapes.map(
      (subshapePath) => path.resolve(subshapePath),
    ).map(read);
    const readResults = [_ubershape, ..._subshapes];
    ensureDirSync(outDir);
    for (const { schema } of readResults) {
      writeJsAndDts(schema, outDir, schema2js(schema));
    }
  });
