import type { DatabaseDiagram } from "@/core/diagram";

export const FOREIGN_KEY_ACTIONS = [
  "NO ACTION",
  "CASCADE",
  "RESTRICT",
  "SET NULL",
] as const;

export type ForeignKeyAction = (typeof FOREIGN_KEY_ACTIONS)[number];
export type DatabaseEngine = "postgresql";

export interface DatabaseProject {
  id: string;
  name: string;
  engine: DatabaseEngine;
  schemas: DatabaseSchema[];
  diagram: DatabaseDiagram;
}

export interface DatabaseSchema {
  id: string;
  name: string;
  sequences: DatabaseSequence[];
  tables: DatabaseTable[];
}

export interface DatabaseSequence {
  id: string;
  name: string;
  startWith: number;
  incrementBy: number;
}

export interface DatabaseTable {
  id: string;
  name: string;
  columns: DatabaseColumn[];
  foreignKeys: DatabaseForeignKey[];
  uniqueConstraints: DatabaseUniqueConstraint[];
  indexes: DatabaseIndex[];
}

export interface DatabaseColumn {
  id: string;
  name: string;
  type: string;
  size?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
  sequenceName?: string;
}

export interface DatabaseForeignKey {
  id: string;
  name: string;
  sourceColumns: string[];
  targetSchema: string;
  targetTable: string;
  targetColumns: string[];
  onUpdate?: ForeignKeyAction;
  onDelete?: ForeignKeyAction;
}

export interface DatabaseUniqueConstraint {
  id: string;
  name: string;
  columns: string[];
}

export interface DatabaseIndex {
  id: string;
  name: string;
  columns: string[];
}

export type DatabaseColumnInput = Omit<DatabaseColumn, "id">;
export type DatabaseForeignKeyInput = Omit<DatabaseForeignKey, "id">;
export type DatabaseIndexInput = Omit<DatabaseIndex, "id">;
export type DatabaseUniqueConstraintInput = Omit<
  DatabaseUniqueConstraint,
  "id"
>;
export type DatabaseSequenceInput = Omit<DatabaseSequence, "id">;

export type CreateResult = {
  project: DatabaseProject;
  id: string;
};
