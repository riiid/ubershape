import { kebab2camel, kebab2pascal } from '../misc/case';
import { Record, Type, Union } from '../parser/ast';
import { Schema } from '../schema';

export function schema2js(schema: Schema): JsAndDts {
  const jsBuffer: string[] = [
    `
      function _every(arr, fn) {
        if (!Array.isArray(arr)) return false;
        return arr.every(fn);
      }
      function isBoolean(value) { return typeof value === 'boolean'; }
      function isNumber(value) { return typeof value === 'number'; }
      function isString(value) { return typeof value === 'string'; }
    `,
  ];
  const dtsBuffer: string[] = [];
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

function type2js(type: Type): string {
  if (type.multiple) {
    return kebab2pascal(type.type.text) + '[]';
  } else {
    return kebab2pascal(type.type.text);
  }
}

function record2js(schema: Schema, record: Record): JsAndDts {
  const typeName = kebab2pascal(record.name.text);
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
            `_every(value.${fieldName}, is${fieldTypeName})` :
            `is${fieldTypeName}(value.${fieldName})`
          );
          return `
            if (value.${fieldName} != null && !${fieldIsValid}) {
              return false;
            }
          `;
        }).join('')}
        return true;
      };
    `,
    dts: `
      export interface ${typeName} {
        ${record.fields.map(field => {
          const name = kebab2pascal(field.name.text);
          const type = type2js(field.type);
          return `${name}: ${type};\n`;
        }).join('')}
      }
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}

function union2js(schema: Schema, union: Union): JsAndDts {
  const typeName = kebab2pascal(union.name.text);
  return {
    js: `
      exports.is${typeName} = is${typeName};
      function is${typeName}(value) {
        if (!Array.isArray(value)) return false;
        if (value.length !== 2) return false;
        switch (value[0]) {
          ${union.types.map(type => {
            const typeName = kebab2pascal(type.type.text);
            return `
              case '${type2str(type)}': return ${
                type.multiple ?
                `_every(value[1], is${typeName})` :
                `is${typeName}(value[1])`
              };
            `;
          }).join('')}
          default: return false;
        }
      };
    `,
    dts: `
      export type ${typeName} =
        ${union.types.map(type => {
          return `| ['${type2str(type)}', ${type2js(type)}]\n`;
        }).join('')}
        ;
      export function is${typeName}(value: any): value is ${typeName};
    `,
  };
}
