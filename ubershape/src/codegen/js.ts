import { kebab2camel, kebab2pascal } from "../misc/case.ts";
import { Def, Enum, Record, Root, Type, Union } from "../parser/ast.ts";
import { Token } from "../parser/recursive-descent-parser.ts";
import { isPrimitiveTypeName } from "../primitive.ts";
import { Schema, SchemaType } from "../schema.ts";
import { getRoot } from "../ubershape.ts";

export function schema2js(schema: Schema): JsAndDts {
  const root = getRoot(schema.shape)!;
  const recordAndUnions = schema.shape.defs.filter(
    (def) => def.kind !== "root",
  ) as Exclude<Def, Root>[];
  const jsBuffer: string[] = [
    `
      function every(arr, fn) {
        if (!Array.isArray(arr)) return false;
        return arr.every(fn);
      }
      function isBoolean(value) { return typeof value === 'boolean'; }
      function isNumber(value) { return typeof value === 'number'; }
      function isString(value) { return typeof value === 'string'; }
    `,
    schema.kind === SchemaType.Subshape
      ? `
      exports.${kebab2camel(schema.name)}ShapeSelection = {
        ${
        recordAndUnions.map((def) =>
          `
          '${def.name.text}': {
            ${
            getFragments(def).map((fragment) =>
              `
              '${fragment}': true,
            `
            ).join("")
          }
          },
        `
        ).join("")
      }
      };
    `
      : "",
  ];
  const dtsBuffer: string[] = [
    schema.kind === SchemaType.Ubershape
      ? `
      export interface $ShapeSelection {
        ${
        recordAndUnions.map((def) =>
          `
          '${def.name.text}'?: {
            ${
            getFragments(def).map((fragment) =>
              `
              '${fragment}'?: true,
            `
            ).join("")
          }
          },
        `
        ).join("")
      }
      }
    `
      : `
      import { $ShapeSelection } from './${schema.ubershape.name}';
      export const ${kebab2camel(schema.name)}ShapeSelection: $ShapeSelection;
    `,
  ];
  {
    const { js, dts } = root2js(schema, root);
    jsBuffer.push(js);
    dtsBuffer.push(dts);
  }
  for (const def of recordAndUnions) {
    const { js, dts } = def2js(schema, def);
    jsBuffer.push(js);
    dtsBuffer.push(dts);
  }
  {
    const { js, dts } = schema2VisitorJs(schema);
    jsBuffer.push(js);
    dtsBuffer.push(dts);
  }
  return {
    js: jsBuffer.join(""),
    dts: dtsBuffer.join(""),
  };
}

export interface JsAndDts {
  js: string;
  dts: string;
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

function root2js(schema: Schema, root: Root): JsAndDts {
  const roots = `[${
    root.types.map(
      (rootType) => `'${type2str(rootType)}'`,
    ).join(",")
  }]`;
  const rootTypes = root.types.map(
    (rootType) => rootType2js(schema, rootType),
  );
  return {
    js: `
      ${rootTypes.map(({ js }) => js).join("")}
      exports.roots = ${roots};
    `,
    dts: `
      ${rootTypes.map(({ dts }) => dts).join("")}
      export const roots: ${roots};
    `,
  };
}

function rootType2js(schema: Schema, rootType: Type): JsAndDts {
  const typeName = typeName2Js(schema, rootType.type);
  const encodeFunctionName = (
    rootType.multiple ? `encode${typeName}Array` : `encode${typeName}`
  );
  const decodeFunctionName = (
    rootType.multiple ? `decode${typeName}Array` : `decode${typeName}`
  );
  return {
    js: `
      exports.${encodeFunctionName} = ${encodeFunctionName};
      function ${encodeFunctionName}(value) {
        return JSON.stringify(value);
      }
      exports.${decodeFunctionName} = ${decodeFunctionName};
      function ${decodeFunctionName}(value) {
        const obj = JSON.parse(value);
        if (!${
      rootType.multiple ? `every(obj, is${typeName})` : `is${typeName}(obj)`
    }) throw new Error();
        return obj;
      }
    `,
    dts: `
      export function ${encodeFunctionName}(value: ${
      type2js(schema, rootType)
    }): string;
      export function ${decodeFunctionName}(value: string): ${
      type2js(schema, rootType)
    };
    `,
  };
}

function def2js(schema: Schema, def: Exclude<Def, Root>): JsAndDts {
  switch (def.kind) {
    case "record":
      return record2js(schema, def);
    case "union":
      return union2js(schema, def);
    case "enum":
      return enum2js(schema, def);
  }
}

function record2js(schema: Schema, record: Record): JsAndDts {
  const typeName = typeName2Js(schema, record.name);
  return {
    js: `
      exports.is${typeName} = is${typeName};
      function is${typeName}(value) {
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
        return `
              if (${fieldValue} != null && !${fieldIsValid}) {
                return false;
              }
            `;
      }).join("")
    }
        return true;
      }
    `,
    dts: `
      ${record.comments.map((comment) => comment.text).join("\n")}
      export interface ${typeName} {
        ${
      record.fields.map((field) => {
        const type = type2js(schema, field.type);
        return `'${field.name.text}'?: ${type};\n`;
      }).join("")
    }
      }
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}

function union2js(schema: Schema, union: Union): JsAndDts {
  const typeName = typeName2Js(schema, union.name);
  return {
    js: `
      exports.is${typeName} = is${typeName};
      function is${typeName}(value) {
        if (!Array.isArray(value)) return false;
        if (value.length !== 2) return false;
        switch (value[0]) {
          ${
      union.types.map((type) => {
        const typeName = typeName2Js(schema, type.type);
        return `
              case '${type2str(type)}': return ${
          type.multiple
            ? `every(value[1], is${typeName})`
            : `is${typeName}(value[1])`
        };
            `;
      }).join("")
    }
          default: return false;
        }
      }
    `,
    dts: `
      ${union.comments.map((comment) => comment.text).join("\n")}
      export type ${typeName} =
        ${
      union.types.map((type) => {
        return `| ['${type2str(type)}', ${type2js(schema, type)}]\n`;
      }).join("")
    }
        ;
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}

function enum2js(schema: Schema, enumDef: Enum): JsAndDts {
  const typeName = typeName2Js(schema, enumDef.name);
  return {
    js: `
      exports.is${typeName} = is${typeName};
      function is${typeName}(value) {
        if (typeof value !== 'string') return false;
        return !!is${typeName}.table[value];
      }
      is${typeName}.table = {
        ${
      enumDef.values.map(
        (value) => `'#${value.name.text}': true`,
      ).join(",\n")
    }
      };
    `,
    dts: `
      ${enumDef.comments.map((comment) => comment.text).join("\n")}
      export type ${typeName} =
        ${
      enumDef.values.map((value) => {
        return `| '#${value.name.text}'\n`;
      }).join("")
    }
        ;
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}

function schema2VisitorJs(schema: Schema): JsAndDts {
  const _exhaustiveCheck = (x: never): never => {
    throw new Error("exhuastive check failure");
  };
  const recordAndUnions = schema.shape.defs.filter(
    (def) => def.kind !== "root",
  ) as Exclude<Def, Root>[];
  return {
    js: `
      exports.visitor = {
        ${
      recordAndUnions.map((def) => {
        switch (def.kind) {
          case "record":
            return record2VisitorJs(schema, def).js;
          case "union":
            return union2VisitorJs(schema, def).js;
          case "enum":
            return enum2VisitorJs(schema, def).js;
          default:
            return _exhaustiveCheck(def);
        }
      }).filter(Boolean).join(",\n")
    }
      };
    `,
    dts: `
      export interface Visitor {
        ${
      recordAndUnions.map((def) => {
        switch (def.kind) {
          case "record":
            return record2VisitorJs(schema, def).dts;
          case "union":
            return union2VisitorJs(schema, def).dts;
          case "enum":
            return enum2VisitorJs(schema, def).dts;
          default:
            return _exhaustiveCheck(def);
        }
      }).filter(Boolean).join("\n")
    }
      }
      export const visitor: Visitor;
    `,
  };
}

function record2VisitorJs(schema: Schema, record: Record): JsAndDts {
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
  return {
    js: `
      visit${recordName}(visitor, _value) {
        const value = {..._value};
        ${
      [
        ...singleRecordFields.map((field) =>
          `
        if (value['${field.name.text}'] != null) {
          value['${field.name.text}'] = visitor.visit${
            typeName2Js(schema, field.type.type)
          }(visitor, value['${field.name.text}'])
        }
          `
        ),
        ...multipleFields.map((field) =>
          `
        if (value['${field.name.text}'] != null) {
          value['${field.name.text}'] = value['${field.name.text}'].map(x => visitor.visit${
            typeName2Js(schema, field.type.type)
          }(visitor, x))
        }
          `
        ),
      ].join("\n")
    }
        return value;
      }`,
    dts: `
      visit${recordName}(visitor: Visitor, value: ${recordName}): ${recordName};
    `,
  };
}

function union2VisitorJs(schema: Schema, union: Union): JsAndDts {
  const unionName = typeName2Js(schema, union.name);
  return {
    js: `
      visit${unionName}(visitor, value) {
        switch (value[0]) {
          ${
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
      }`,
    dts: `
      visit${unionName}(visitor: Visitor, value: ${unionName}): ${unionName};
    `,
  };
}

function enum2VisitorJs(schema: Schema, enumDef: Enum): JsAndDts {
  const enumName = typeName2Js(schema, enumDef.name);
  return {
    js: `
      visit${enumName}(visitor, value) {
        return value;
      }`,
    dts: `
      visit${enumName}(visitor: Visitor, value: ${enumName}): ${enumName};
    `,
  };
}
