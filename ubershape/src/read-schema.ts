import * as fs from 'fs';
import * as path from 'path';
import { parse as parseSubshape, ParseResult as SubshapeParseResult } from './parser/subshape';
import { parse as parseUbershape, ParseResult as UbershapeParseResult } from './parser/ubershape';
import { Schema, SchemaType } from './schema';
import { applySubshape } from './subshape';

type ParseResult = SubshapeParseResult | UbershapeParseResult;
export interface ReadResult {
  parseResult: ParseResult;
  schema: Schema;
}

export function getReadFunction() {
  const memo: { [absoluteSchemaFilePath: string]: ReadResult } = {};
  return read;
  function read(absoluteSchemaFilePath: string): ReadResult {
    if (memo[absoluteSchemaFilePath]) return memo[absoluteSchemaFilePath];
    memo[absoluteSchemaFilePath] = readFromFs(absoluteSchemaFilePath);
    return memo[absoluteSchemaFilePath];
  }
  function readFromFs(absoluteSchemaFilePath: string): ReadResult {
    const code = fs.readFileSync(absoluteSchemaFilePath, 'utf8');
    if (absoluteSchemaFilePath.endsWith('.ubershape')) {
      return readUbershape(absoluteSchemaFilePath, code);
    } else {
      return readSubshape(absoluteSchemaFilePath, code);
    }
  }
  function readUbershape(absoluteSchemaFilePath: string, code: string): ReadResult {
    const kind = SchemaType.Ubershape;
    const name = path.basename(absoluteSchemaFilePath, '.ubershape');
    const parseResult = parseUbershape(code);
    const shape = parseResult.ast;
    return {
      parseResult,
      schema: {
        kind,
        name,
        shape,
      },
    };
  }
  function readSubshape(absoluteSchemaFilePath: string, code: string): ReadResult {
    const kind = SchemaType.Subshape;
    const name = path.basename(absoluteSchemaFilePath, '.subshape');
    const parseResult = parseSubshape(code);
    const subshapeAst = parseResult.ast;
    const ubershapePath = path.join(
      path.dirname(absoluteSchemaFilePath),
      subshapeAst.use.ubershapePath.text
    );
    if (absoluteSchemaFilePath === ubershapePath) throw new Error('TODO: write error message');
    const ubershape = read(ubershapePath).schema;
    if (ubershape.kind !== SchemaType.Ubershape) throw new Error('TODO: write error message');
    const shape = applySubshape(ubershape.shape, subshapeAst);
    return {
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
