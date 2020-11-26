import * as mkdirp from 'mkdirp';
import * as path from 'path';
import { schema2js } from '../../codegen/js';
import { writeJsAndDts } from '../../codegen/write-file';
import { getReadFunction } from '../../read-schema';
import type { Yargs, ArgvFromBuilder } from '../type';

export const command = 'codegen <ubershape> [subshapes..]';
export const desc = 'generate runtime codes from schema files';
export function builder(yargs: Yargs) {
  return (
    yargs
    .option('out', {
      alias: 'o',
      describe: 'out directory',
      string: true,
      demandOption: true,
    })
    .option('target', {
      alias: 't',
      describe: 'target language',
      default: 'js',
      choices: ['js'],
    })
  );
}
interface Argv extends ArgvFromBuilder<typeof builder> {
  ubershape: string;
  subshapes: string[];
}
export function handler(argv: Argv) {
  const outDir = path.resolve(argv.out);
  const read = getReadFunction();
  const ubershape = read(path.resolve(argv.ubershape));
  const subshapes = argv.subshapes.map(
    subshapePath => path.resolve(subshapePath)
  ).map(read);
  const readResults = [ubershape, ...subshapes];
  mkdirp.sync(outDir);
  for (const { schema } of readResults) {
    writeJsAndDts(schema, outDir, schema2js(schema));
  }
}
