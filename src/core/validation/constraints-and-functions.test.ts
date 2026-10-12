import { describe, expect, it } from "vitest";
import {
  validateNamedColumnList,
  validateNoDuplicateIndexDefinitions,
  validateCheckConstraint,
} from "./constraints";
import { validateDatabaseFunction } from "./function";

describe("validateNamedColumnList and validateCheckConstraint", () => {
  const table = {
    name: "orders",
    columns: [
      { id: "col-1", name: "order_id" },
      { id: "col-2", name: "total" },
    ],
  };

  it("validates named column lists and handles error paths", () => {
    expect(() => validateNamedColumnList(null, table, "Index")).toThrow(
      'Invalid index in table "orders".',
    );

    // Empty columns
    expect(() =>
      validateNamedColumnList(
        { id: "idx-1", name: "idx_empty", columns: [] },
        table,
        "Index",
      ),
    ).toThrow('Index "idx_empty" must have at least one column.');

    // Table missing columns array
    expect(() =>
      validateNamedColumnList(
        { id: "idx-1", name: "idx_test", columns: ["order_id"] },
        { name: "bad_table" },
        "Index",
      ),
    ).toThrow('Table "bad_table" columns are required.');

    // Column not found in table
    expect(() =>
      validateNamedColumnList(
        { id: "idx-1", name: "idx_test", columns: ["missing_col"] },
        table,
        "Index",
      ),
    ).toThrow('references missing column "missing_col"');

    // Method empty string
    expect(() =>
      validateNamedColumnList(
        { id: "idx-1", name: "idx_test", columns: ["order_id"], method: "" },
        table,
        "Index",
      ),
    ).toThrow('Index "idx_test" method must be a non-empty string.');

    // Valid index with method
    expect(() =>
      validateNamedColumnList(
        { id: "idx-1", name: "idx_test", columns: ["order_id"], method: "gin" },
        table,
        "Index",
      ),
    ).not.toThrow();
  });

  it("validates duplicate index definitions", () => {
    const indexes = [
      { id: "idx-1", name: "idx_1", columns: ["order_id"], method: "btree" },
      { id: "idx-2", name: "idx_2", columns: ["order_id"], method: "btree" },
    ];
    expect(() =>
      validateNoDuplicateIndexDefinitions(indexes, 'Table "orders" indexes'),
    ).toThrow();
  });

  it("validates check constraints and handles error paths", () => {
    expect(() => validateCheckConstraint(null, table)).toThrow(
      'Invalid check constraint in table "orders".',
    );

    // Empty expression
    expect(() =>
      validateCheckConstraint(
        { id: "chk-1", name: "chk_test", expression: "   " },
        table,
      ),
    ).toThrow('expression is required in table "orders"');

    // columnIds not array
    expect(() =>
      validateCheckConstraint(
        { id: "chk-1", name: "chk_test", expression: "total > 0", columnIds: "bad" },
        table,
      ),
    ).toThrow('columnIds must be an array');

    // Table missing columns
    expect(() =>
      validateCheckConstraint(
        { id: "chk-1", name: "chk_test", expression: "total > 0", columnIds: ["col-1"] },
        { name: "orders" },
      ),
    ).toThrow('Table "orders" columns are required.');

    // Missing column id
    expect(() =>
      validateCheckConstraint(
        { id: "chk-1", name: "chk_test", expression: "total > 0", columnIds: ["col-missing"] },
        table,
      ),
    ).toThrow('references missing column id "col-missing"');
  });
});

describe("validateDatabaseFunction", () => {
  const validFn = {
    id: "fn-1",
    schemaId: "s-1",
    name: "calculate_tax",
    language: "plpgsql",
    returnType: "numeric",
    body: "BEGIN RETURN 10; END;",
    arguments: [
      { id: "arg-1", name: "amount", dataType: "numeric", mode: "IN" },
    ],
  };
  const schemas = [{ id: "s-1", name: "public" }];

  it("passes for valid function", () => {
    const res = validateDatabaseFunction(validFn, schemas);
    expect(res.id).toBe("fn-1");
  });

  it("throws when function is invalid or schema does not exist", () => {
    expect(() => validateDatabaseFunction(null, schemas)).toThrow("Invalid function definition.");
    expect(() =>
      validateDatabaseFunction({ ...validFn, schemaId: "s-unknown" }, schemas),
    ).toThrow('Schema with id "s-unknown" does not exist.');
  });

  it("throws when language is not plpgsql or sql", () => {
    expect(() =>
      validateDatabaseFunction({ ...validFn, language: "python" }, schemas),
    ).toThrow('Function language must be "plpgsql" or "sql".');
  });

  it("validates arguments array and argument mode", () => {
    expect(() =>
      validateDatabaseFunction({ ...validFn, arguments: "not-an-array" }, schemas),
    ).toThrow('arguments must be an array.');

    expect(() =>
      validateDatabaseFunction({ ...validFn, arguments: [null] }, schemas),
    ).toThrow('Invalid argument at index 0');

    expect(() =>
      validateDatabaseFunction(
        {
          ...validFn,
          arguments: [{ id: "arg-1", name: "x", dataType: "int", mode: "INVALID_MODE" }],
        },
        schemas,
      ),
    ).toThrow('Argument mode must be "IN", "OUT" or "INOUT".');
  });
});
