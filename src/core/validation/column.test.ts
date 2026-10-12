import { describe, expect, it } from "vitest";
import { validateColumn } from "./column";

describe("validateColumn", () => {
  const validCol = {
    id: "col-1",
    name: "price",
    type: "numeric",
    size: 10,
    scale: 2,
    nullable: true,
    primaryKey: false,
  };

  it("passes for valid column", () => {
    expect(() => validateColumn(validCol, "products", [])).not.toThrow();
  });

  it("throws when column is not an object or lacks id/name", () => {
    expect(() => validateColumn(null, "products", [])).toThrow('Invalid column in table "products".');
    expect(() => validateColumn({ id: "" }, "products", [])).toThrow();
  });

  it("throws when column type is not supported", () => {
    expect(() =>
      validateColumn({ ...validCol, type: "unsupported_type" }, "products", []),
    ).toThrow('type "unsupported_type" is not supported');
  });

  it("throws when isArray is not a boolean", () => {
    expect(() =>
      validateColumn({ ...validCol, isArray: "true" }, "products", []),
    ).toThrow('isArray must be boolean');
  });

  it("validates size and scale constraints", () => {
    // Non-positive size for varchar
    expect(() =>
      validateColumn({ ...validCol, type: "varchar", size: 0 }, "products", []),
    ).toThrow('size must be a positive integer');

    // Type does not support size (e.g. integer)
    expect(() =>
      validateColumn({ ...validCol, type: "integer", size: 10 }, "products", []),
    ).toThrow('does not support size');

    // Negative scale
    expect(() =>
      validateColumn({ ...validCol, type: "numeric", size: 10, scale: -1 }, "products", []),
    ).toThrow('scale must be zero or a positive integer');

    // Scale greater than size
    expect(() =>
      validateColumn({ ...validCol, type: "numeric", size: 5, scale: 10 }, "products", []),
    ).toThrow('scale cannot be greater than size');

    // Type does not support scale
    expect(() =>
      validateColumn({ ...validCol, type: "varchar", size: 50, scale: 2 }, "products", []),
    ).toThrow('does not support scale');
  });

  it("validates sequenceName and defaultValue interactions", () => {
    // Non-string sequenceName
    expect(() =>
      validateColumn({ ...validCol, sequenceName: 123 }, "products", []),
    ).toThrow('sequenceName must be string');

    // Both sequenceName and defaultValue
    expect(() =>
      validateColumn(
        { ...validCol, sequenceName: "my_seq", defaultValue: "10" },
        "products",
        [{ name: "my_seq" }],
      ),
    ).toThrow('cannot have both sequenceName and defaultValue');

    // Missing sequence in table's schema sequences
    expect(() =>
      validateColumn(
        { ...validCol, sequenceName: "unknown_seq" },
        "products",
        [],
      ),
    ).toThrow('references missing sequence "unknown_seq"');

    // Valid sequence reference
    expect(() =>
      validateColumn(
        { ...validCol, sequenceName: "known_seq" },
        "products",
        [{ name: "known_seq" }],
      ),
    ).not.toThrow();
  });

  it("validates defaultValue formatting", () => {
    expect(() =>
      validateColumn(
        { ...validCol, defaultValue: 123 },
        "products",
        [],
      ),
    ).toThrow('defaultValue must be string');

    expect(() =>
      validateColumn(
        { ...validCol, defaultValue: "1; DROP TABLE users;" },
        "products",
        [],
      ),
    ).toThrow('defaultValue cannot contain semicolon or line breaks');
  });
});
