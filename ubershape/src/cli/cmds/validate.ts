import * as path from 'path';
import { validate } from '../../io/validate-schema';
import type { Yargs, ArgvFromBuilder } from '../type';

export const command = 'validate <schema-files..>';
export const desc = 'validate schema files';
export function builder(yargs: Yargs) {
  return yargs;
}
interface Argv extends ArgvFromBuilder<typeof builder> {
  schemaFiles: string[];
}
export function handler(argv: Argv) {
  const absoluteSchemaFilePaths = argv.schemaFiles.map(
    schemaFilePath => path.resolve(schemaFilePath)
  );
  for (const absoluteSchemaFilePath of absoluteSchemaFilePaths) {
    validate(absoluteSchemaFilePath);
  }
}
