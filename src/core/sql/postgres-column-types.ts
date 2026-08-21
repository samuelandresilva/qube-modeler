export const POSTGRES_COLUMN_TYPES = [
  "bigint",
  "integer",
  "smallint",
  "numeric",
  "decimal",
  "boolean",
  "varchar",
  "char",
  "text",
  "date",
  "timestamp",
  "timestamp with time zone",
  "time",
  "uuid",
  "jsonb",
] as const;

export type PostgresColumnType = (typeof POSTGRES_COLUMN_TYPES)[number];

export function isArrayType(columnType: string): boolean {
  return /\[\]$/.test(columnType.trim());
}

export function getBaseType(columnType: string): string {
  return columnType.replace(/(\s*\[\s*\])+$/, "").trim();
}

const SIZE_COLUMN_TYPES: readonly string[] = [
  "varchar",
  "char",
  "numeric",
  "decimal",
];

const SCALE_COLUMN_TYPES: readonly string[] = ["numeric", "decimal"];

export function isPostgresColumnType(
  value: unknown,
): value is PostgresColumnType | `${PostgresColumnType}[]` {
  if (typeof value !== "string") return false;
  const baseType = getBaseType(value);
  return (POSTGRES_COLUMN_TYPES as readonly string[]).includes(baseType);
}

export function supportsSize(columnType: string): boolean {
  return SIZE_COLUMN_TYPES.includes(getBaseType(columnType));
}

export function supportsScale(columnType: string): boolean {
  return SCALE_COLUMN_TYPES.includes(getBaseType(columnType));
}

export function getDefaultSize(columnType: string): number | undefined {
  const baseType = getBaseType(columnType);
  if (baseType === "varchar") {
    return 255;
  }

  if (baseType === "char") {
    return 1;
  }

  if (baseType === "numeric" || baseType === "decimal") {
    return 10;
  }

  return undefined;
}

export function getDefaultScale(columnType: string): number | undefined {
  const baseType = getBaseType(columnType);
  if (supportsScale(baseType)) {
    return 2;
  }

  return undefined;
}
