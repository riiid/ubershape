import * as path from "https://deno.land/std@0.93.0/path/mod.ts";
import {
  parse as parseSubshape,
  ParseResult as SubshapeParseResult,
} from "../parser/subshape.ts";
import {
  parse as parseUbershape,
  ParseResult as UbershapeParseResult,
} from "../parser/ubershape.ts";
import { Schema, SchemaType } from "../schema.ts";
import { applySubshape } from "../subshape.ts";

type ParseResult = SubshapeParseResult | UbershapeParseResult;
export interface ReadResult {
  absoluteSchemaFilePath: string;
  parseResult: ParseResult;
  schema: Schema;
}
export interface ReadFn {
  (absoluteSchemaFilePath: string): ReadResult;
}

export function getReadFunction(): ReadFn {
  const memo: { [absoluteSchemaFilePath: string]: ReadResult } = {};
  return read;
  function read(absoluteSchemaFilePath: string): ReadResult {
    if (memo[absoluteSchemaFilePath]) return memo[absoluteSchemaFilePath];
    memo[absoluteSchemaFilePath] = readFromFs(absoluteSchemaFilePath);
    return memo[absoluteSchemaFilePath];
  }
  function readFromFs(absoluteSchemaFilePath: string): ReadResult {
    const code = Deno.readTextFileSync(absoluteSchemaFilePath);
    if (absoluteSchemaFilePath.endsWith(".ubershape")) {
      return readUbershape(absoluteSchemaFilePath, code);
    } else {
      return readSubshape(absoluteSchemaFilePath, code);
    }
  }
  function readUbershape(
    absoluteSchemaFilePath: string,
    code: string,
  ): ReadResult {
    const kind = SchemaType.Ubershape;
    const name = path.basename(absoluteSchemaFilePath, ".ubershape");
    const parseResult = parseUbershape(code);
    const shape = parseResult.ast;
    return {
      absoluteSchemaFilePath,
      parseResult,
      schema: {
        kind,
        name,
        shape,
      },
    };
  }
  function readSubshape(
    absoluteSchemaFilePath: string,
    code: string,
  ): ReadResult {
    const kind = SchemaType.Subshape;
    const name = path.basename(absoluteSchemaFilePath, ".subshape");
    const parseResult = parseSubshape(code);
    const subshapeAst = parseResult.ast;
    const ubershapePath = path.join(
      path.dirname(absoluteSchemaFilePath),
      subshapeAst.use.ubershapePath.text,
    );
    if (absoluteSchemaFilePath === ubershapePath) {
      throw new Error("TODO: write error message");
    }
    const ubershape = read(ubershapePath).schema;
    if (ubershape.kind !== SchemaType.Ubershape) {
      throw new Error("TODO: write error message");
    }
    const shape = applySubshape(ubershape.shape, subshapeAst);
    return {
      absoluteSchemaFilePath,
      parseResult,
      schema: {
        kind,
        name,
        shape,
        ubershape,
        subshapeAst,
      },
    };
  }
}
