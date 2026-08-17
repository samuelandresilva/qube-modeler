import type { DatabaseColumn } from "@/core/model";
import {
  getBaseType,
  isArrayType,
  supportsScale,
  supportsSize,
} from "./postgres-column-types";

export function generatePostgresColumnTypeSql(column: DatabaseColumn): string {
  const baseType = getBaseType(column.type);
  const isArray = Boolean(column.isArray || isArrayType(column.type));

  let typeSql = baseType;
  if (supportsScale(baseType)) {
    if (typeof column.size === "number" && typeof column.scale === "number") {
      typeSql = `${baseType}(${column.size},${column.scale})`;
    }
  } else if (supportsSize(baseType)) {
    if (typeof column.size === "number") {
      typeSql = `${baseType}(${column.size})`;
    }
  }

  if (isArray) {
    const match = column.type.match(/(\s*\[\s*\])+$/);
    const brackets = match ? match[0].replace(/\s+/g, "") : "[]";
    return `${typeSql}${brackets}`;
  }

  return typeSql;
}

