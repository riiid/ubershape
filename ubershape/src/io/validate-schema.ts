import { SchemaType } from "../schema.ts";
import { validateSubshape } from "../subshape.ts";
import { validateUbershape } from "../ubershape.ts";
import { printError, PrintlnFn } from "./print-error.ts";
import { getReadFunction, ReadFn } from "./read-schema.ts";

export function validate(
  absoluteSchemaFilePath: string,
  readFn: ReadFn = getReadFunction(),
  println: PrintlnFn = console.error,
) {
  const readResult = readFn(absoluteSchemaFilePath);
  const errors = (
    readResult.schema.kind === SchemaType.Ubershape
      ? validateUbershape(readResult.schema.shape)
      : validateSubshape(
        readResult.schema.ubershape.shape,
        readResult.schema.subshapeAst,
      )
  );
  for (const error of errors) printError(error, readResult, println);
  if (errors.length > 0) Deno.exit(1);
}
