import { describe, it, expect } from "vitest";
import {
  createDatabaseFunction,
  updateDatabaseFunction,
  removeDatabaseFunction,
} from "./function";
import { createProjectFixture, createSchemaFixture } from "../../test-utils/project-fixtures";
import type { DatabaseFunctionArgument } from "../types";

describe("Database function model commands", () => {
  const schema = createSchemaFixture({
    id: "s1",
    name: "public",
  });
  const initialProject = createProjectFixture({
    schemas: [schema],
    functions: [],
  });

  it("1. Add function cria item em project.functions", () => {
    const { id, project } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_new_function",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    expect(id).toBeDefined();
    expect(project.functions).toHaveLength(1);
    expect(project.functions![0].name).toBe("fn_new_function");
    expect(project.functions![0].id).toBe(id);
  });

  it("2. Editar name atualiza function", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_old",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    const updated = updateDatabaseFunction(projectWithFn, id, { name: "fn_new" });
    expect(updated.functions![0].name).toBe("fn_new");
  });

  it("3. Editar language atualiza function", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_test",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    const updated = updateDatabaseFunction(projectWithFn, id, { language: "sql" });
    expect(updated.functions![0].language).toBe("sql");
  });

  it("4. Editar returnType atualiza function", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_test",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    const updated = updateDatabaseFunction(projectWithFn, id, { returnType: "integer" });
    expect(updated.functions![0].returnType).toBe("integer");
  });

  it("5. Editar body atualiza function", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_test",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    const updated = updateDatabaseFunction(projectWithFn, id, { body: "SELECT 1;" });
    expect(updated.functions![0].body).toBe("SELECT 1;");
  });

  it("6. Add/Update/Remove arguments em function", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_test",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    // Add arguments
    const args: DatabaseFunctionArgument[] = [
      { id: "a1", name: "a", dataType: "integer" },
      { id: "a2", name: "b", dataType: "text" },
    ];
    const projectWithArgs = updateDatabaseFunction(projectWithFn, id, { arguments: args });
    expect(projectWithArgs.functions![0].arguments).toHaveLength(2);
    expect(projectWithArgs.functions![0].arguments[0].name).toBe("a");

    // Remove argument
    const projectWithLessArgs = updateDatabaseFunction(projectWithArgs, id, {
      arguments: [args[0]],
    });
    expect(projectWithLessArgs.functions![0].arguments).toHaveLength(1);
    expect(projectWithLessArgs.functions![0].arguments[0].name).toBe("a");
  });

  it("7. Remove function remove item de project.functions", () => {
    const { id, project: projectWithFn } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_to_remove",
      language: "plpgsql",
      returnType: "trigger",
      arguments: [],
      body: "BEGIN\n    RETURN NEW;\nEND;",
    });

    const projectAfterRemoval = removeDatabaseFunction(projectWithFn, id);
    expect(projectAfterRemoval.functions).toHaveLength(0);
  });

  it("8. Assinatura duplicada pode ser detectada pela mesma regra da UI", () => {
    const { project: p1 } = createDatabaseFunction(initialProject, {
      schemaId: "s1",
      name: "fn_sum",
      language: "sql",
      returnType: "integer",
      arguments: [
        { id: "a1", name: "a", dataType: "integer" },
        { id: "a2", name: "b", dataType: "integer" },
      ],
      body: "SELECT a + b;",
    });

    // Check if duplicating signatures behaves as expected
    const checkDuplicate = (schemaId: string, name: string, args: DatabaseFunctionArgument[]) => {
      const normalizedName = name.trim().toLowerCase();
      const currentArgTypes = args.map((a) => a.dataType.trim().toLowerCase()).join(",");

      return (p1.functions ?? []).some((fn) => {
        const fnName = fn.name.trim().toLowerCase();
        const fnArgTypes = fn.arguments.map((a) => a.dataType.trim().toLowerCase()).join(",");
        return fn.schemaId === schemaId && fnName === normalizedName && fnArgTypes === currentArgTypes;
      });
    };

    // Same schema, same name, same argument types => Duplicate
    const isDup = checkDuplicate("s1", "fn_sum", [
      { id: "x", name: "x", dataType: "integer" },
      { id: "y", name: "y", dataType: "integer" },
    ]);
    expect(isDup).toBe(true);

    // Same schema, same name, different argument types => Not duplicate (overload)
    const isNotDupArgs = checkDuplicate("s1", "fn_sum", [
      { id: "x", name: "x", dataType: "integer" },
    ]);
    expect(isNotDupArgs).toBe(false);

    // Different schema, same name, same argument types => Not duplicate
    const isNotDupSchema = checkDuplicate("s2", "fn_sum", [
      { id: "x", name: "x", dataType: "integer" },
      { id: "y", name: "y", dataType: "integer" },
    ]);
    expect(isNotDupSchema).toBe(false);
  });
});
