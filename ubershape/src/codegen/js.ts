import { kebab2camel, kebab2pascal } from '../misc/case';
import { Record, Root, Type, Union } from '../parser/ast';
import { Token } from '../parser/recursive-descent-parser';
import { isPrimitiveTypeName } from '../primitive';
import { Schema, SchemaType } from '../schema';
import { getRoot } from '../ubershape';

export function schema2js(schema: Schema): JsAndDts {
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
  ];
  const dtsBuffer: string[] = [];
  {
    const root = getRoot(schema.shape)!;
    const { js, dts } = root2js(schema, root);
    jsBuffer.push(js);
    dtsBuffer.push(dts);
  }
  const recordAndUnions = schema.shape.defs.filter(
    def => def.kind !== 'root'
  ) as (Record | Union)[];
  for (const def of recordAndUnions) {
    const { js, dts } = (
      def.kind === 'record' ?
      record2js(schema, def) :
      union2js(schema, def)
    );
    jsBuffer.push(js);
    dtsBuffer.push(dts);
  }
  return {
    js: jsBuffer.join(''),
    dts: dtsBuffer.join(''),
  };
}

interface JsAndDts {
  js: string;
  dts: string;
}

function type2str(type: Type): string {
  if (type.multiple) {
    return type.type.text + '[]';
  } else {
    return type.type.text;
  }
}

function type2js(schema: Schema, type: Type): string {
  if (type.multiple) {
    return typeName2Js(schema, type.type) + '[]';
  } else {
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
  const codes = root.types.map(
    rootType => rootType2js(schema, rootType)
  );
  return {
    js: codes.map(({ js }) => js).join(''),
    dts: codes.map(({ dts }) => dts).join(''),
  };
}

function rootType2js(schema: Schema, rootType: Type): JsAndDts {
  const typeName = typeName2Js(schema, rootType.type);
  const encodeFunctionName = (
    rootType.multiple ?
    `encode${typeName}Array` :
    `encode${typeName}`
  );
  const decodeFunctionName = (
    rootType.multiple ?
    `decode${typeName}Array` :
    `decode${typeName}`
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
          rootType.multiple ?
          `every(obj, is${typeName})` :
          `is${typeName}(obj)`
        }) throw new Error();
        return obj;
      }
    `,
    dts: `
      export function ${encodeFunctionName}(value: ${type2js(schema, rootType)}): string;
      export function ${decodeFunctionName}(value: string): ${type2js(schema, rootType)};
    `,
  };
}

function record2js(schema: Schema, record: Record): JsAndDts {
  const typeName = typeName2Js(schema, record.name);
  return {
    js: `
      exports.is${typeName} = is${typeName};
      function is${typeName}(value) {
        if (value == null) return false;
        if (typeof value !== 'object') return false;
        ${record.fields.map(field => {
          const fieldName = kebab2camel(field.name.text);
          const fieldTypeName = kebab2pascal(field.type.type.text);
          const fieldIsValid = (
            field.type.multiple ?
            `every(value.${fieldName}, is${fieldTypeName})` :
            `is${fieldTypeName}(value.${fieldName})`
          );
          return `
            if (value.${fieldName} != null && !${fieldIsValid}) {
              return false;
            }
          `;
        }).join('')}
        return true;
      }
    `,
    dts: `
      export interface ${typeName} {
        ${record.fields.map(field => {
          const name = kebab2camel(field.name.text);
          const type = type2js(schema, field.type);
          return `${name}: ${type};\n`;
        }).join('')}
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
          ${union.types.map(type => {
            const typeName = typeName2Js(schema, type.type);
            return `
              case '${type2str(type)}': return ${
                type.multiple ?
                `every(value[1], is${typeName})` :
                `is${typeName}(value[1])`
              };
            `;
          }).join('')}
          default: return false;
        }
      }
    `,
    dts: `
      export type ${typeName} =
        ${union.types.map(type => {
          return `| ['${type2str(type)}', ${type2js(schema, type)}]\n`;
        }).join('')}
        ;
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}
