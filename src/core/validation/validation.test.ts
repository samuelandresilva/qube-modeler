import { describe, it, expect } from "vitest";
import { validateProject } from "./project";
import { validateTable } from "./table";
import { createTable } from "../model/commands/table";
import { createEmptyProject } from "../model/create-project";
import { createQbmFile, parseQbmFile } from "../qbm/qbm-file";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
  createColumnFixture,
} from "../test-utils/project-fixtures";
import type { DatabaseTable, CheckConstraint, DatabaseFunction } from "../model/types";

describe("CHECK constraints validation and normalization", () => {
  it("1. Nova tabela inicializa checkConstraints como []", () => {
    const project = createProjectFixture();
    const schema = createSchemaFixture({ id: "schema-1", name: "public" });
    const projectWithSchema = {
      ...project,
      schemas: [schema],
    };
    
    const result = createTable(projectWithSchema, "schema-1");
    const createdTable = result.project.schemas[0].tables[0];
    
    expect(createdTable.checkConstraints).toBeDefined();
    expect(createdTable.checkConstraints).toEqual([]);
  });

  it("2. Projeto antigo sem checkConstraints é normalizado", () => {
    // Montar tabela sem checkConstraints (removendo a chave ou usando casting)
    const oldTable = {
      id: "table-1",
      name: "users",
      columns: [],
      foreignKeys: [],
      indexes: [],
      uniqueConstraints: [],
    } as unknown as DatabaseTable;
    const oldSchema = createSchemaFixture({ tables: [oldTable] });
    const oldProject = createProjectFixture({ schemas: [oldSchema] });

    const normalizedProject = validateProject(oldProject);
    const normalizedTable = normalizedProject.schemas[0].tables[0];

    expect(normalizedTable.checkConstraints).toBeDefined();
    expect(normalizedTable.checkConstraints).toEqual([]);
  });

  it("3. Projeto com CHECK preserva dados", () => {
    const tableWithCheck = createTableFixture({
      columns: [createColumnFixture({ id: "col-age", name: "age" })],
      checkConstraints: [
        {
          id: "chk-1",
          name: "chk_tb_users_age",
          expression: "age BETWEEN 0 AND 120",
          columnIds: ["col-age"],
        },
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithCheck] });
    const project = createProjectFixture({ schemas: [schema] });

    // validateProject serializa/normaliza e valida
    const validatedProject = validateProject(JSON.parse(JSON.stringify(project)));
    const validatedTable = validatedProject.schemas[0].tables[0];

    expect(validatedTable.checkConstraints).toHaveLength(1);
    expect(validatedTable.checkConstraints[0]).toEqual({
      id: "chk-1",
      name: "chk_tb_users_age",
      expression: "age BETWEEN 0 AND 120",
      columnIds: ["col-age"],
    });
  });

  it("4. Validação rejeita CHECK sem name", () => {
    const tableWithInvalidCheck = createTableFixture({
      checkConstraints: [
        {
          id: "chk-1",
          name: "", // name vazio/sem name
          expression: "age > 0",
        } as unknown as CheckConstraint,
      ],
    });
    
    expect(() => {
      validateTable(tableWithInvalidCheck, "public", [], []);
    }).toThrow();
  });

  it("5. Validação rejeita CHECK sem expression", () => {
    const tableWithInvalidCheck = createTableFixture({
      checkConstraints: [
        {
          id: "chk-1",
          name: "chk_age",
          expression: "", // expression vazia/sem expression
        } as unknown as CheckConstraint,
      ],
    });
    
    expect(() => {
      validateTable(tableWithInvalidCheck, "public", [], []);
    }).toThrow();
  });

  it("6. Validação rejeita nome duplicado de CHECK na mesma tabela", () => {
    const tableWithDuplicateChecks = createTableFixture({
      checkConstraints: [
        {
          id: "chk-1",
          name: "chk_age",
          expression: "age > 0",
        },
        {
          id: "chk-2",
          name: "chk_age", // nome duplicado
          expression: "age < 150",
        },
      ],
    });
    
    expect(() => {
      validateTable(tableWithDuplicateChecks, "public", [], []);
    }).toThrow();
  });

  it("7. Validação rejeita columnIds apontando para coluna inexistente", () => {
    const tableWithInvalidColumnRef = createTableFixture({
      columns: [createColumnFixture({ id: "col-1", name: "id" })],
      checkConstraints: [
        {
          id: "chk-1",
          name: "chk_id",
          expression: "id > 0",
          columnIds: ["non-existent-col-id"], // coluna não existe
        },
      ],
    });
    
    expect(() => {
      validateTable(tableWithInvalidColumnRef, "public", [], []);
    }).toThrow();
  });
});

describe("Database Functions validation and normalization", () => {
  it("1. Projeto novo inicializa functions como []", () => {
    const project = createEmptyProject();
    expect(project.functions).toBeDefined();
    expect(project.functions).toEqual([]);
  });

  it("2. Projeto antigo sem functions normaliza para []", () => {
    const oldProject = {
      id: "proj-1",
      name: "Old Project",
      engine: "postgresql",
      schemas: [
        {
          id: "schema-1",
          name: "public",
          sequences: [],
          tables: [],
        },
      ],
      diagram: { tableNodes: [] },
    };

    const validated = validateProject(oldProject);
    expect(validated.functions).toBeDefined();
    expect(validated.functions).toEqual([]);
  });

  it("3. Save/load ou export/import preserva functions", () => {
    const fn = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "calculate_total",
      language: "plpgsql" as const,
      returnType: "numeric",
      arguments: [
        {
          id: "arg-1",
          name: "price",
          dataType: "numeric",
          mode: "IN" as const,
        },
        {
          id: "arg-2",
          name: "tax",
          dataType: "numeric",
          mode: "IN" as const,
        },
      ],
      body: "BEGIN return price + (price * tax); END;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
      functions: [fn],
    });

    const qbm = createQbmFile(project, { versions: [] }, "1.0.0");
    const json = JSON.stringify(qbm);
    const parsed = parseQbmFile(json);

    expect(parsed.project.functions).toHaveLength(1);
    expect(parsed.project.functions[0]).toEqual(fn);
  });

  it("4. Validação rejeita function sem id", () => {
    const invalidFn = {
      id: "",
      schemaId: "schema-1",
      name: "test_func",
      language: "sql" as const,
      returnType: "integer",
      arguments: [],
      body: "SELECT 1;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [invalidFn as unknown as DatabaseFunction],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("5. Validação rejeita schemaId inexistente", () => {
    const invalidFn = {
      id: "fn-1",
      schemaId: "non-existent-schema",
      name: "test_func",
      language: "sql" as const,
      returnType: "integer",
      arguments: [],
      body: "SELECT 1;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [invalidFn as unknown as DatabaseFunction],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("6. Validação rejeita language inválida", () => {
    const invalidFn = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "test_func",
      language: "javascript" as unknown as "sql",
      returnType: "integer",
      arguments: [],
      body: "return 1;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [invalidFn as unknown as DatabaseFunction],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("7. Validação rejeita returnType vazio", () => {
    const invalidFn = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "test_func",
      language: "sql" as const,
      returnType: "",
      arguments: [],
      body: "SELECT 1;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [invalidFn],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("8. Validação rejeita body vazio", () => {
    const invalidFn = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "test_func",
      language: "sql" as const,
      returnType: "integer",
      arguments: [],
      body: "",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [invalidFn],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("9. Validação rejeita assinatura duplicada no mesmo schema", () => {
    const fn1 = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "add",
      language: "sql" as const,
      returnType: "integer",
      arguments: [
        { id: "a1", name: "a", dataType: "integer" },
        { id: "a2", name: "b", dataType: "integer" },
      ],
      body: "SELECT a + b;",
    };

    const fn2 = {
      id: "fn-2",
      schemaId: "schema-1",
      name: "add",
      language: "sql" as const,
      returnType: "integer",
      arguments: [
        { id: "a3", name: "x", dataType: "integer" },
        { id: "a4", name: "y", dataType: "integer" },
      ],
      body: "SELECT x + y;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [fn1, fn2],
    });

    expect(() => validateProject(project)).toThrow();
  });

  it("10. Permite mesmo nome com assinatura diferente no mesmo schema", () => {
    const fn1 = {
      id: "fn-1",
      schemaId: "schema-1",
      name: "add",
      language: "sql" as const,
      returnType: "integer",
      arguments: [
        { id: "a1", name: "a", dataType: "integer" },
        { id: "a2", name: "b", dataType: "integer" },
      ],
      body: "SELECT a + b;",
    };

    const fn2 = {
      id: "fn-2",
      schemaId: "schema-1",
      name: "add",
      language: "sql" as const,
      returnType: "text",
      arguments: [
        { id: "a3", name: "x", dataType: "text" },
        { id: "a4", name: "y", dataType: "text" },
      ],
      body: "SELECT x || y;",
    };

    const project = createProjectFixture({
      schemas: [createSchemaFixture({ id: "schema-1" })],
      functions: [fn1, fn2],
    });

    const validated = validateProject(project);
    expect(validated.functions).toHaveLength(2);
  });
});

