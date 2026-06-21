import type { DatabaseColumn } from "@/core/model";
import { supportsScale, supportsSize } from "./postgres-column-types";

export function generatePostgresColumnTypeSql(column: DatabaseColumn): string {
  if (supportsScale(column.type)) {
    if (typeof column.size === "number" && typeof column.scale === "number") {
      return `${column.type}(${column.size},${column.scale})`;
    }

    return column.type;
  }

  if (supportsSize(column.type)) {
    if (typeof column.size === "number") {
      return `${column.type}(${column.size})`;
    }

    return column.type;
  }

  return column.type;
}
