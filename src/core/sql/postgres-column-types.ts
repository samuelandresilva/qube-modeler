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

const SIZE_COLUMN_TYPES: readonly string[] = [
  "varchar",
  "char",
  "numeric",
  "decimal",
];

const SCALE_COLUMN_TYPES: readonly string[] = ["numeric", "decimal"];

export function isPostgresColumnType(
  value: unknown,
): value is PostgresColumnType {
  return (
    typeof value === "string" &&
    (POSTGRES_COLUMN_TYPES as readonly string[]).includes(value)
  );
}

export function supportsSize(columnType: string): boolean {
  return SIZE_COLUMN_TYPES.includes(columnType);
}

export function supportsScale(columnType: string): boolean {
  return SCALE_COLUMN_TYPES.includes(columnType);
}

export function getDefaultSize(columnType: string): number | undefined {
  if (columnType === "varchar") {
    return 255;
  }

  if (columnType === "char") {
    return 1;
  }

  if (columnType === "numeric" || columnType === "decimal") {
    return 10;
  }

  return undefined;
}

export function getDefaultScale(columnType: string): number | undefined {
  if (supportsScale(columnType)) {
    return 2;
  }

  return undefined;
}
