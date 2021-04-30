import { kebab2camel, kebab2pascal } from "../misc/case.ts";
import { Def, Enum, Record, Root, Type, Union } from "../parser/ast.ts";
import { Token } from "../parser/recursive-descent-parser.ts";
import { isPrimitiveTypeName } from "../primitive.ts";
import { Schema, SchemaType, SubshapeSchema } from "../schema.ts";
import { getRoot } from "../ubershape.ts";

export function schema2ts(schema: Schema): string {
  const root = getRoot(schema.shape)!;
  const recordAndUnions = schema.shape.defs.filter(
    (def) => def.kind !== "root",
  ) as Exclude<Def, Root>[];
  const tsBuffer: string[] = [
    schema.kind === SchemaType.Ubershape
      ? getShapeSelectionTypeTs(recordAndUnions)
      : `import { $ShapeSelection } from './${schema.ubershape.name}';`,
    fixtureTs(),
    schema.kind === SchemaType.Subshape
      ? getShapeSelectionImplTs(schema, recordAndUnions)
      : "",
    root2ts(schema, root),
    ...recordAndUnions.map((def) => def2ts(schema, def)),
    schema2VisitorTs(schema),
  ];
  return tsBuffer.join("\n");
}

function fixtureTs(): string {
  return `
    function every(arr: any[], fn: (value: any) => boolean) {
      if (!Array.isArray(arr)) return false;
      return arr.every(fn);
    }
    function isBoolean(value: any) { return typeof value === 'boolean'; }
    function isNumber(value: any) { return typeof value === 'number'; }
    function isString(value: any) { return typeof value === 'string'; }
  `;
}

function getShapeSelectionTypeTs(
  recordAndUnions: (Record | Union | Enum)[],
): string {
  const fields = recordAndUnions.map((def) =>
    `'${def.name.text}'?:{${
      getFragments(def)
        .map((fragment) => `'${fragment}'?: true,`)
        .join("")
    }},`
  ).join("");
  return `export interface $ShapeSelection {${fields}}`;
}

function getShapeSelectionImplTs(
  schema: SubshapeSchema,
  recordAndUnions: (Record | Union | Enum)[],
): string {
  const fields = recordAndUnions.map((def) =>
    `'${def.name.text}': {${
      getFragments(def).map((fragment) => `'${fragment}': true,`).join("")
    }},`
  ).join("");
  return `export const ${
    kebab2camel(schema.name)
  }ShapeSelection: $ShapeSelection = {${fields}};`;
}

function getFragments(def: Exclude<Def, Root>): string[] {
  switch (def.kind) {
    case "record":
      return def.fields.map((field) => field.name.text);
    case "union":
      return def.types.map(type2str);
    case "enum":
      return def.values.map((value) => "#" + value.name.text);
  }
}

function type2str(type: Type): string {
  if (type.multiple) {
    return type.type.text + "[]";
  } else {
    return type.type.text;
  }
}

function type2js(schema: Schema, type: Type): string {
  if (type.multiple) {
    return typeName2Js(schema, type.type) + "[]";
  } else {
    if (isPrimitiveTypeName(type.type.text)) return type.type.text;
    return typeName2Js(schema, type.type);
  }
}

function typeName2Js(schema: Schema, type: Token): string {
  if (schema.kind === SchemaType.Subshape && !isPrimitiveTypeName(type.text)) {
    return kebab2pascal(schema.name) + kebab2pascal(type.text);
  } else {
    return kebab2pascal(type.text);
  }
}

function root2ts(schema: Schema, root: Root): string {
  return [
    ...root.types.map(
      (rootType) => rootType2ts(schema, rootType),
    ),
    `export const roots = [${
      root.types.map(
        (rootType) => `'${type2str(rootType)}'`,
      ).join(",")
    }] as const;`,
  ].join("\n");
}

function rootType2ts(schema: Schema, rootType: Type): string {
  const typeName = typeName2Js(schema, rootType.type);
  const encodeFunctionName = (
    rootType.multiple ? `encode${typeName}Array` : `encode${typeName}`
  );
  const decodeFunctionName = (
    rootType.multiple ? `decode${typeName}Array` : `decode${typeName}`
  );
  const encodeFunctionCode = `export function ${encodeFunctionName}(value: ${
    type2js(schema, rootType)
  }): string {return JSON.stringify(value);}`;
  const decodeFunctionCode =
    `export function ${decodeFunctionName}(value: string): ${
      type2js(schema, rootType)
    } { const obj = JSON.parse(value); if (!${
      rootType.multiple ? `every(obj, is${typeName})` : `is${typeName}(obj)`
    }) throw new Error(); return obj; }`;
  return [encodeFunctionCode, decodeFunctionCode].join("\n");
}

function def2ts(schema: Schema, def: Exclude<Def, Root>): string {
  switch (def.kind) {
    case "record":
      return record2ts(schema, def);
    case "union":
      return union2ts(schema, def);
    case "enum":
      return enum2ts(schema, def);
  }
}

function record2ts(schema: Schema, record: Record): string {
  const typeName = typeName2Js(schema, record.name);
  return [
    record.comments.map((comment) => comment.text).join("\n"),
    `export interface ${typeName} {${
      record.fields.map((field) => {
        const type = type2js(schema, field.type);
        return `'${field.name.text}'?: ${type};\n`;
      }).join("")
    }}`,
    `export function is${typeName}(value: any): value is ${typeName} {
      if (value == null) return false;
      if (typeof value !== 'object') return false;
      ${
      record.fields.map((field) => {
        const fieldValue = `value['${field.name.text}']`;
        const fieldTypeName = typeName2Js(schema, field.type.type);
        const fieldIsValid = (
          field.type.multiple
            ? `every(${fieldValue}, is${fieldTypeName})`
            : `is${fieldTypeName}(${fieldValue})`
        );
        return `if (${fieldValue} != null && !${fieldIsValid}) {return false;}`;
      }).join("")
    }
      return true;
    }`,
  ].join("\n");
}

function union2ts(schema: Schema, union: Union): string {
  const typeName = typeName2Js(schema, union.name);
  return [
    union.comments.map((comment) => comment.text).join("\n"),
    `export type ${typeName} = ${
      union.types.map((type) => {
        return `| ['${type2str(type)}', ${type2js(schema, type)}]\n`;
      }).join("")
    };`,
    `export function is${typeName}(value: any): value is ${typeName} {
      if (!Array.isArray(value)) return false;
      if (value.length !== 2) return false;
      switch (value[0]) {${
      union.types.map((type) => {
        const typeName = typeName2Js(schema, type.type);
        return `case '${type2str(type)}': return ${
          type.multiple
            ? `every(value[1], is${typeName})`
            : `is${typeName}(value[1])`
        };`;
      }).join("")
    } default: return false;
      }
    }`,
  ].join("\n");
}

function enum2ts(schema: Schema, enumDef: Enum): string {
  const typeName = typeName2Js(schema, enumDef.name);
  return [
    enumDef.comments.map((comment) => comment.text).join("\n"),
    `export type ${typeName} = ${
      enumDef.values.map((value) => `|'#${value.name.text}'`).join("")
    };`,
    `export function is${typeName}(value: any): value is ${typeName} {
      if (typeof value !== 'string') return false;
      return !!is${typeName}.table[value as keyof (typeof is${typeName})['table']];
    }`,
    `is${typeName}.table = {${
      enumDef.values.map(
        (value) => `'#${value.name.text}':true`,
      ).join(",")
    }} as const;`,
  ].join("\n");
}

function schema2VisitorTs(schema: Schema): string {
  const _exhaustiveCheck = (x: never): never => {
    throw new Error("exhuastive check failure");
  };
  const recordAndUnions = schema.shape.defs.filter(
    (def) => def.kind !== "root",
  ) as Exclude<Def, Root>[];
  return [
    `export interface Visitor {${
      recordAndUnions.map((def) => {
        switch (def.kind) {
          case "record":
            return record2VisitorTypeTs(schema, def);
          case "union":
            return union2VisitorTypeTs(schema, def);
          case "enum":
            return enum2VisitorTypeTs(schema, def);
          default:
            return _exhaustiveCheck(def);
        }
      }).filter(Boolean).join("\n")
    }}`,
    `export const visitor: Visitor = {${
      recordAndUnions.map((def) => {
        switch (def.kind) {
          case "record":
            return record2VisitorImplTs(schema, def);
          case "union":
            return union2VisitorImplTs(schema, def);
          case "enum":
            return enum2VisitorImplTs(schema, def);
          default:
            return _exhaustiveCheck(def);
        }
      }).filter(Boolean).join(",\n")
    }};`,
  ].join("\n");
}

function record2VisitorTypeTs(schema: Schema, record: Record): string {
  const recordName = typeName2Js(schema, record.name);
  return `visit${recordName}(visitor: Visitor, value: ${recordName}): ${recordName};`;
}

function record2VisitorImplTs(schema: Schema, record: Record): string {
  const recordName = typeName2Js(schema, record.name);
  const singleRecordFields = record.fields.filter(
    (field) => !field.type.multiple,
  ).filter(
    (field) =>
      schema.shape.defs.find(
        (def) =>
          (def.kind === "record" || def.kind === "union" ||
            def.kind === "enum") && def.name.text === field.type.type.text,
      ) != null,
  );
  const multipleFields = record.fields.filter((field) => field.type.multiple);
  return `
    visit${recordName}(visitor, _value) {
      const value = {..._value}; ${
    [
      ...singleRecordFields.map((field) =>
        `if (value['${field.name.text}'] != null) {
          value['${field.name.text}'] = visitor.visit${
          typeName2Js(schema, field.type.type)
        }(visitor, value['${field.name.text}'])
        }`
      ),
      ...multipleFields.map((field) =>
        `if (value['${field.name.text}'] != null) {
          value['${field.name.text}'] = value['${field.name.text}'].map(x => visitor.visit${
          typeName2Js(schema, field.type.type)
        }(visitor, x))
        }`
      ),
    ].join("\n")
  }
    return value;
  }`;
}

function union2VisitorTypeTs(schema: Schema, union: Union): string {
  const unionName = typeName2Js(schema, union.name);
  return `visit${unionName}(visitor: Visitor, value: ${unionName}): ${unionName};`;
}

function union2VisitorImplTs(schema: Schema, union: Union): string {
  const unionName = typeName2Js(schema, union.name);
  return `visit${unionName}(visitor, value) {
    switch (value[0]) {${
    union.types.map((type) => (`
      case '${type.type.text}':
        return [value[0], visitor.visit${
      typeName2Js(schema, type.type)
    }(visitor, value[1])];
        `)).join("\n")
  }
      default:
        return value;
    }
  }`;
}

function enum2VisitorTypeTs(schema: Schema, enumDef: Enum): string {
  const enumName = typeName2Js(schema, enumDef.name);
  return `visit${enumName}(visitor: Visitor, value: ${enumName}): ${enumName};`;
}

function enum2VisitorImplTs(schema: Schema, enumDef: Enum): string {
  const enumName = typeName2Js(schema, enumDef.name);
  return `visit${enumName}(visitor, value) {
    return value;
  }`;
}
