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
import type { DatabaseTable, CheckConstraint, DatabaseFunction, DatabaseTrigger } from "../model/types";

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

describe("PostgreSQL Triggers validation and normalization", () => {
  it("1. Nova tabela inicializa triggers como []", () => {
    const project = createProjectFixture();
    const schema = createSchemaFixture({ id: "schema-1", name: "public" });
    const projectWithSchema = {
      ...project,
      schemas: [schema],
    };
    
    const result = createTable(projectWithSchema, "schema-1");
    const createdTable = result.project.schemas[0].tables[0];
    
    expect(createdTable.triggers).toBeDefined();
    expect(createdTable.triggers).toEqual([]);
  });

  it("2. Projeto antigo sem triggers é normalizado", () => {
    const oldTable = {
      id: "table-1",
      name: "users",
      columns: [],
      foreignKeys: [],
      indexes: [],
      uniqueConstraints: [],
      checkConstraints: [],
    } as unknown as DatabaseTable;
    const oldSchema = createSchemaFixture({ tables: [oldTable] });
    const oldProject = createProjectFixture({ schemas: [oldSchema] });

    const normalizedProject = validateProject(oldProject);
    const normalizedTable = normalizedProject.schemas[0].tables[0];

    expect(normalizedTable.triggers).toBeDefined();
    expect(normalizedTable.triggers).toEqual([]);
  });

  it("3. Projeto com trigger válido preserva dados", () => {
    const tableWithTrigger = createTableFixture({
      triggers: [
        {
          id: "trg-1",
          name: "trg_log_users",
          eventTiming: "BEFORE",
          events: ["INSERT", "UPDATE"],
          functionId: "fn-1",
          forEach: "ROW",
          condition: "NEW.age > 18",
          isConstraint: true,
          deferrable: true,
          initiallyDeferred: false,
        },
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithTrigger] });
    const project = createProjectFixture({ schemas: [schema] });

    const validatedProject = validateProject(JSON.parse(JSON.stringify(project)));
    const validatedTable = validatedProject.schemas[0].tables[0];

    expect(validatedTable.triggers).toHaveLength(1);
    expect(validatedTable.triggers[0]).toEqual({
      id: "trg-1",
      name: "trg_log_users",
      eventTiming: "BEFORE",
      events: ["INSERT", "UPDATE"],
      functionId: "fn-1",
      forEach: "ROW",
      condition: "NEW.age > 18",
      isConstraint: true,
      deferrable: true,
      initiallyDeferred: false,
    });
  });

  it("4. Validação rejeita trigger com nome inválido", () => {
    const tableWithInvalidTrigger = createTableFixture({
      triggers: [
        {
          id: "trg-1",
          name: "invalid name spaces",
          eventTiming: "BEFORE",
          events: ["INSERT"],
          functionId: "fn-1",
          forEach: "ROW",
        } as unknown as DatabaseTrigger,
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithInvalidTrigger] });
    const project = createProjectFixture({ schemas: [schema] });

    expect(() => validateProject(project)).toThrow();
  });

  it("5. Validação rejeita trigger com eventTiming inválido", () => {
    const tableWithInvalidTrigger = createTableFixture({
      triggers: [
        {
          id: "trg-1",
          name: "trg_test",
          eventTiming: "INVALID" as unknown as "BEFORE",
          events: ["INSERT"],
          functionId: "fn-1",
          forEach: "ROW",
        },
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithInvalidTrigger] });
    const project = createProjectFixture({ schemas: [schema] });

    expect(() => validateProject(project)).toThrow();
  });

  it("6. Validação rejeita trigger com events vazio", () => {
    const tableWithInvalidTrigger = createTableFixture({
      triggers: [
        {
          id: "trg-1",
          name: "trg_test",
          eventTiming: "BEFORE",
          events: [],
          functionId: "fn-1",
          forEach: "ROW",
        },
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithInvalidTrigger] });
    const project = createProjectFixture({ schemas: [schema] });

    expect(() => validateProject(project)).toThrow();
  });

  it("7. Validação rejeita trigger com forEach inválido", () => {
    const tableWithInvalidTrigger = createTableFixture({
      triggers: [
        {
          id: "trg-1",
          name: "trg_test",
          eventTiming: "BEFORE",
          events: ["INSERT"],
          functionId: "fn-1",
          forEach: "INVALID" as unknown as "ROW",
        },
      ],
    });
    const schema = createSchemaFixture({ tables: [tableWithInvalidTrigger] });
    const project = createProjectFixture({ schemas: [schema] });

    expect(() => validateProject(project)).toThrow();
  });
});

describe("Views validation and normalization", () => {
  it("1. Projeto antigo sem views é normalizado com views como []", () => {
    const oldProject = {
      id: "proj-1",
      name: "Test Project",
      engine: "postgresql",
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      diagram: { tableNodes: [] },
      functions: [],
    };

    const normalizedProject = validateProject(oldProject);
    expect(normalizedProject.views).toBeDefined();
    expect(normalizedProject.views).toEqual([]);
  });

  it("2. Validador aceita view válida e preserva dados", () => {
    const validProject = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      views: [
        {
          id: "view-1",
          schemaId: "schema-1",
          name: "v_active_users",
          definition: "SELECT * FROM users WHERE active = true",
          isMaterialized: false,
        },
      ],
    });

    const validated = validateProject(validProject);
    expect(validated.views).toHaveLength(1);
    expect(validated.views[0]).toEqual({
      id: "view-1",
      schemaId: "schema-1",
      name: "v_active_users",
      definition: "SELECT * FROM users WHERE active = true",
      isMaterialized: false,
      triggers: [],
      x: 100,
      y: 100,
    });
  });

  it("3. Validador rejeita view com id inválido", () => {
    const invalidProject = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      views: [
        {
          id: "",
          schemaId: "schema-1",
          name: "v_active_users",
          definition: "SELECT * FROM users WHERE active = true",
          isMaterialized: false,
        },
      ],
    });

    expect(() => validateProject(invalidProject)).toThrow();
  });

  it("4. Validador rejeita view com schemaId que não existe", () => {
    const invalidProject = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      views: [
        {
          id: "view-1",
          schemaId: "schema-invalid",
          name: "v_active_users",
          definition: "SELECT * FROM users WHERE active = true",
          isMaterialized: false,
        },
      ],
    });

    expect(() => validateProject(invalidProject)).toThrow();
  });

  it("5. Validador rejeita view se isMaterialized não for boolean", () => {
    const invalidProject = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      views: [
        {
          id: "view-1",
          schemaId: "schema-1",
          name: "v_active_users",
          definition: "SELECT * FROM users WHERE active = true",
          isMaterialized: "false" as unknown as boolean,
        },
      ],
    });

    expect(() => validateProject(invalidProject)).toThrow();
  });

  it("6. Validador rejeita view se coordenadas x ou y não forem números", () => {
    const invalidProject = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "schema-1", name: "public" }),
      ],
      views: [
        {
          id: "view-1",
          schemaId: "schema-1",
          name: "v_active_users",
          definition: "SELECT * FROM users WHERE active = true",
          isMaterialized: false,
          x: "100" as unknown as number,
          y: 100,
        },
      ],
    });

    expect(() => validateProject(invalidProject)).toThrow();
  });
});

describe("Project validation and backward compatibility", () => {
  it("should normalize legacy project files missing visual grouping properties", () => {
    const legacyProject = {
      id: "proj-1",
      engine: "postgresql",
      name: "Legacy Project",
      schemas: [
        {
          id: "schema-1",
          name: "public",
          tables: [],
          sequences: [],
        },
      ],
      diagram: {
        tableNodes: [],
      },
    };

    const raw = legacyProject as unknown as Record<string, unknown>;

    // Before parsing/validation, subjectAreas and textNotes are undefined
    expect(raw.subjectAreas).toBeUndefined();
    expect(raw.textNotes).toBeUndefined();

    const validated = validateProject(legacyProject);

    expect(validated.subjectAreas).toBeDefined();
    expect(validated.subjectAreas).toEqual([]);
    expect(validated.textNotes).toBeDefined();
    expect(validated.textNotes).toEqual([]);
  });

  describe("Column array types validation", () => {
    it("accepts valid array column types (varchar[], integer[], text[], etc.) and isArray: true", () => {
      const project = {
        id: "proj-1",
        engine: "postgresql",
        name: "Test Project",
        schemas: [
          {
            id: "schema-1",
            name: "public",
            sequences: [],
            tables: [
              {
                id: "table-1",
                name: "users",
                columns: [
                  {
                    id: "col-1",
                    name: "tags",
                    type: "varchar[]",
                    size: 100,
                    nullable: true,
                    primaryKey: false,
                  },
                  {
                    id: "col-2",
                    name: "scores",
                    type: "integer",
                    isArray: true,
                    nullable: false,
                    primaryKey: false,
                  },
                  {
                    id: "col-3",
                    name: "rates",
                    type: "numeric[]",
                    size: 10,
                    scale: 2,
                    nullable: true,
                    primaryKey: false,
                  },
                ],
                foreignKeys: [],
                indexes: [],
                uniqueConstraints: [],
                checkConstraints: [],
                triggers: [],
              },
            ],
          },
        ],
        diagram: { tableNodes: [] },
      };

      const validated = validateProject(project);
      expect(validated.schemas[0].tables[0].columns).toHaveLength(3);
    });

    it("rejects invalid column array base types", () => {
      const project = {
        id: "proj-1",
        engine: "postgresql",
        name: "Test Project",
        schemas: [
          {
            id: "schema-1",
            name: "public",
            sequences: [],
            tables: [
              {
                id: "table-1",
                name: "users",
                columns: [
                  {
                    id: "col-1",
                    name: "data",
                    type: "invalid_type[]",
                    nullable: true,
                    primaryKey: false,
                  },
                ],
                foreignKeys: [],
                indexes: [],
                uniqueConstraints: [],
                checkConstraints: [],
                triggers: [],
              },
            ],
          },
        ],
        diagram: { tableNodes: [] },
      };

      expect(() => validateProject(project)).toThrow(
        'Column "data" type "invalid_type[]" is not supported.',
      );
    });

    it("rejects isArray if not boolean", () => {
      const project = {
        id: "proj-1",
        engine: "postgresql",
        name: "Test Project",
        schemas: [
          {
            id: "schema-1",
            name: "public",
            sequences: [],
            tables: [
              {
                id: "table-1",
                name: "users",
                columns: [
                  {
                    id: "col-1",
                    name: "scores",
                    type: "integer",
                    isArray: "yes" as unknown as boolean,
                    nullable: true,
                    primaryKey: false,
                  },
                ],
                foreignKeys: [],
                indexes: [],
                uniqueConstraints: [],
                checkConstraints: [],
                triggers: [],
              },
            ],
          },
        ],
        diagram: { tableNodes: [] },
      };

      expect(() => validateProject(project)).toThrow(
        'Column "scores" isArray must be boolean.',
      );
    });
  });
});

