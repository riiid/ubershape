import { SchemaType } from '../schema';
import { validateSubshape } from '../subshape';
import { validateUbershape } from '../ubershape';
import { printError, PrintlnFn } from './print-error';
import { getReadFunction, ReadFn } from './read-schema';

export function validate(
  absoluteSchemaFilePath: string,
  readFn: ReadFn = getReadFunction(),
  println: PrintlnFn = console.error
) {
  const readResult = readFn(absoluteSchemaFilePath);
  const errors = (
    readResult.schema.kind === SchemaType.Ubershape ?
    validateUbershape(readResult.schema.shape) :
    validateSubshape(
      readResult.schema.ubershape.shape,
      readResult.schema.subshapeAst
    )
  );
  for (const error of errors) printError(error, readResult, println);
  if (errors.length > 0) process.exit(1);
}
