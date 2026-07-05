import { describe, it, expect } from "vitest";
import { validateProject } from "./project";
import { validateTable } from "./table";
import { createTable } from "../model/commands/table";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
  createColumnFixture,
} from "../test-utils/project-fixtures";
import type { DatabaseTable, CheckConstraint } from "../model/types";

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
