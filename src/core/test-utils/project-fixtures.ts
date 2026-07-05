import type {
  DatabaseProject,
  DatabaseSchema,
  DatabaseTable,
  DatabaseColumn,
} from "../model/types";

export function createProjectFixture(overrides: Partial<DatabaseProject> = {}): DatabaseProject {
  return {
    id: "proj-1",
    name: "Test Project",
    engine: "postgresql",
    schemas: [],
    diagram: { tableNodes: [] },
    ...overrides,
  };
}

export function createSchemaFixture(overrides: Partial<DatabaseSchema> = {}): DatabaseSchema {
  return {
    id: "schema-1",
    name: "public",
    sequences: [],
    tables: [],
    ...overrides,
  };
}

export function createTableFixture(overrides: Partial<DatabaseTable> = {}): DatabaseTable {
  return {
    id: "table-1",
    name: "users",
    columns: [],
    foreignKeys: [],
    indexes: [],
    uniqueConstraints: [],
    checkConstraints: [],
    ...overrides,
  };
}

export function createColumnFixture(overrides: Partial<DatabaseColumn> = {}): DatabaseColumn {
  return {
    id: "col-1",
    name: "id",
    type: "integer",
    nullable: false,
    primaryKey: false,
    ...overrides,
  };
}
