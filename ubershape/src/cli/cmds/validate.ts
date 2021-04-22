import * as path from "https://deno.land/std@0.93.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.18.0/command/mod.ts";
import { validate } from "../../io/validate-schema.ts";

export default new Command()
  .arguments("<schema-files...:string>")
  .description("validate schema files")
  .action(async (schemaFiles: string[]) => {
    const absoluteSchemaFilePaths = schemaFiles.map(
      (schemaFilePath) => path.resolve(schemaFilePath),
    );
    for (const absoluteSchemaFilePath of absoluteSchemaFilePaths) {
      validate(absoluteSchemaFilePath);
    }
  });
