export const primitiveTypeNames: string[] = [
  "boolean",
  "number",
  "string",
];

const primitiveTypeNameSet = new Set(primitiveTypeNames);
export function isPrimitiveTypeName(typeName: string): boolean {
  return primitiveTypeNameSet.has(typeName);
}
