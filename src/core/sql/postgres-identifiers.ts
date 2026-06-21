import { POSTGRES_RESERVED_WORDS } from "./postgres-reserved-words";

export const SQL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidSqlIdentifier(value: string): boolean {
  return SQL_IDENTIFIER_PATTERN.test(value);
}

export function isPostgresReservedWord(value: string): boolean {
  return POSTGRES_RESERVED_WORDS.has(value.toLowerCase());
}
