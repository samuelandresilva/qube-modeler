import type { DatabaseDiagram } from "../diagram";

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
    onUpdate?: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
    onDelete?: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
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