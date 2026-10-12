import { describe, expect, it } from "vitest";
import { validateForeignKey } from "./foreign-key";

describe("validateForeignKey", () => {
  const targetTable = {
    name: "users",
    columns: [{ name: "id" }],
  };

  const sourceTable = {
    name: "orders",
    columns: [{ name: "user_id" }],
  };

  const projectSchemas = [
    {
      name: "public",
      tables: [targetTable, sourceTable],
    },
  ];

  it("passes for a valid foreign key", () => {
    const validFk = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    };

    expect(() =>
      validateForeignKey(validFk, sourceTable, projectSchemas),
    ).not.toThrow();
  });

  it("throws when foreign key is not an object", () => {
    expect(() => validateForeignKey(null, sourceTable, projectSchemas)).toThrow(
      'Invalid foreign key in table "orders".',
    );
  });

  it("throws when id or name is invalid", () => {
    const invalidId = {
      id: "",
      name: "fk_valid",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
    };
    expect(() => validateForeignKey(invalidId, sourceTable, projectSchemas)).toThrow();

    const invalidName = {
      id: "fk-1",
      name: "123 invalid name",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
    };
    expect(() => validateForeignKey(invalidName, sourceTable, projectSchemas)).toThrow();
  });

  it("throws when target schema or target table is missing", () => {
    const missingSchemaFk = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "non_existent_schema",
      targetTable: "users",
      targetColumns: ["id"],
    };
    expect(() =>
      validateForeignKey(missingSchemaFk, sourceTable, projectSchemas),
    ).toThrow('references missing target schema "non_existent_schema"');

    const missingTableFk = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "non_existent_table",
      targetColumns: ["id"],
    };
    expect(() =>
      validateForeignKey(missingTableFk, sourceTable, projectSchemas),
    ).toThrow('references missing target table "public.non_existent_table"');
  });

  it("throws when source or target columns are empty or missing in table", () => {
    const emptySourceCols = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: [],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
    };
    expect(() =>
      validateForeignKey(emptySourceCols, sourceTable, projectSchemas),
    ).toThrow('must have at least one source column');

    const missingColInSource = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["non_existent_col"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
    };
    expect(() =>
      validateForeignKey(missingColInSource, sourceTable, projectSchemas),
    ).toThrow('references missing source column "non_existent_col"');
  });

  it("throws when source and target column lengths do not match", () => {
    const mismatchedCols = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id", "extra_col"],
    };
    // add extra_col to targetTable for test
    const customTarget = {
      name: "users",
      columns: [{ name: "id" }, { name: "extra_col" }],
    };
    const customSchemas = [{ name: "public", tables: [customTarget, sourceTable] }];

    expect(() =>
      validateForeignKey(mismatchedCols, sourceTable, customSchemas),
    ).toThrow('must have the same number of source and target columns');
  });

  it("throws when onDelete or onUpdate has an invalid action", () => {
    const invalidActionFk = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
      onDelete: "INVALID_ACTION",
    };
    expect(() =>
      validateForeignKey(invalidActionFk, sourceTable, projectSchemas),
    ).toThrow('Foreign key "fk_orders_user" onDelete must be one of:');
  });
});
