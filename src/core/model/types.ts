import type { DatabaseDiagram } from "@/core/diagram";

export const FOREIGN_KEY_ACTIONS = [
  "NO ACTION",
  "CASCADE",
  "RESTRICT",
  "SET NULL",
] as const;

export type ForeignKeyAction = (typeof FOREIGN_KEY_ACTIONS)[number];
export type DatabaseEngine = "postgresql";

export interface DatabaseFunctionArgument {
  id: string;
  name: string;
  dataType: string;
  mode?: "IN" | "OUT" | "INOUT";
}

export interface DatabaseFunction {
  id: string;
  schemaId: string;
  name: string;
  language: "plpgsql" | "sql";
  returnType: string;
  arguments: DatabaseFunctionArgument[];
  body: string;
  comment?: string;
}

export interface SubjectArea {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface TextNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface DatabaseProject {
  id: string;
  name: string;
  engine: DatabaseEngine;
  schemas: DatabaseSchema[];
  diagram: DatabaseDiagram;
  functions: DatabaseFunction[];
  views: DatabaseView[];
  subjectAreas?: SubjectArea[];
  textNotes?: TextNote[];
}

export interface DatabaseSchema {
  id: string;
  name: string;
  sequences: DatabaseSequence[];
  tables: DatabaseTable[];
  comment?: string;
}

export interface DatabaseSequence {
  id: string;
  name: string;
  startWith: number;
  incrementBy: number;
  comment?: string;
}

export interface CheckConstraint {
  id: string;
  name: string;
  expression: string;
  columnIds?: string[];
}

export interface DatabaseTrigger {
  id: string;
  name: string;
  eventTiming: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: ("INSERT" | "UPDATE" | "DELETE" | "TRUNCATE")[];
  functionId: string;
  condition?: string;
  isConstraint?: boolean;
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  forEach: "ROW" | "STATEMENT";
  comment?: string;
}

export interface DatabaseView {
  id: string;
  schemaId: string;
  name: string;
  definition: string;
  isMaterialized: boolean;
  withNoData?: boolean;
  triggers?: DatabaseTrigger[];
  x?: number;
  y?: number;
  comment?: string;
}

export interface DatabaseTable {
  id: string;
  name: string;
  columns: DatabaseColumn[];
  foreignKeys: DatabaseForeignKey[];
  uniqueConstraints: DatabaseUniqueConstraint[];
  indexes: DatabaseIndex[];
  checkConstraints: CheckConstraint[];
  triggers: DatabaseTrigger[];
  comment?: string;
  primaryKeyComment?: string;
  subjectAreaId?: string;
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
  comment?: string;
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
  comment?: string;
}

export interface DatabaseUniqueConstraint {
  id: string;
  name: string;
  columns: string[];
  condition?: string;
  comment?: string;
}

export interface DatabaseIndex {
  id: string;
  name: string;
  columns: string[];
  comment?: string;
}

export type DatabaseColumnInput = Omit<DatabaseColumn, "id">;
export type DatabaseForeignKeyInput = Omit<DatabaseForeignKey, "id">;
export type DatabaseIndexInput = Omit<DatabaseIndex, "id">;
export type DatabaseUniqueConstraintInput = Omit<
  DatabaseUniqueConstraint,
  "id"
>;
export type DatabaseSequenceInput = Omit<DatabaseSequence, "id">;
export type CheckConstraintInput = Omit<CheckConstraint, "id">;
export type DatabaseTriggerInput = Omit<DatabaseTrigger, "id">;
export type DatabaseViewInput = Omit<DatabaseView, "id">;

export type CreateResult = {
  project: DatabaseProject;
  id: string;
};
