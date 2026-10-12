import { describe, expect, it } from "vitest";
import { validateSchema } from "./schema";

describe("validateSchema", () => {
  const validSchema = {
    id: "s-1",
    name: "public",
    sequences: [
      {
        id: "seq-1",
        name: "user_seq",
        startWith: 1,
        incrementBy: 1,
      },
    ],
    tables: [
      {
        id: "t-1",
        name: "users",
        columns: [
          {
            id: "c-1",
            name: "id",
            type: "integer",
            nullable: false,
            primaryKey: true,
          },
        ],
        foreignKeys: [],
        indexes: [],
        uniqueConstraints: [],
        checkConstraints: [],
      },
    ],
  };

  it("passes for a valid schema", () => {
    expect(() => validateSchema(validSchema, [validSchema])).not.toThrow();
  });

  it("throws when schema is not an object or lacks id/name", () => {
    expect(() => validateSchema(null, [])).toThrow("Invalid schema.");
    expect(() => validateSchema({ id: "" }, [])).toThrow();
    expect(() => validateSchema({ id: "s-1", name: "123 bad" }, [])).toThrow();
  });

  it("throws when sequences or tables are missing or not arrays", () => {
    expect(() =>
      validateSchema({ id: "s-1", name: "public" }, []),
    ).toThrow('Schema "public" sequences are required.');

    expect(() =>
      validateSchema({ id: "s-1", name: "public", sequences: [] }, []),
    ).toThrow('Schema "public" tables are required.');
  });

  it("throws when duplicate sequence or table names exist", () => {
    const duplicateSeqs = {
      ...validSchema,
      sequences: [
        { id: "seq-1", name: "seq_1", startWith: 1, incrementBy: 1 },
        { id: "seq-2", name: "seq_1", startWith: 1, incrementBy: 1 },
      ],
    };
    expect(() => validateSchema(duplicateSeqs, [])).toThrow(
      'Schema "public" sequences has duplicated name "seq_1".',
    );

    const duplicateTables = {
      ...validSchema,
      tables: [
        {
          id: "t-1",
          name: "users",
          columns: [{ id: "c-1", name: "id", type: "int", nullable: false, primaryKey: false }],
          foreignKeys: [],
          indexes: [],
          uniqueConstraints: [],
        },
        {
          id: "t-2",
          name: "users",
          columns: [{ id: "c-2", name: "id", type: "int", nullable: false, primaryKey: false }],
          foreignKeys: [],
          indexes: [],
          uniqueConstraints: [],
        },
      ],
    };
    expect(() => validateSchema(duplicateTables, [])).toThrow(
      'Schema "public" tables has duplicated name "users".',
    );
  });

  it("validates sequence properties and rejects invalid incrementBy", () => {
    const invalidSeqObj = {
      ...validSchema,
      sequences: [null],
    };
    expect(() => validateSchema(invalidSeqObj, [])).toThrow(
      'Invalid sequence in schema "public".',
    );

    const zeroIncrement = {
      ...validSchema,
      sequences: [
        { id: "seq-1", name: "seq_zero", startWith: 1, incrementBy: 0 },
      ],
    };
    expect(() => validateSchema(zeroIncrement, [])).toThrow(
      'Sequence "seq_zero" incrementBy cannot be zero.',
    );
  });
});
