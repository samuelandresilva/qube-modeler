import { describe, expect, it } from "vitest";
import { validateTrigger } from "./trigger";
import { validateDatabaseView } from "./view";

describe("validateTrigger", () => {
  const validTrigger = {
    id: "trg-1",
    name: "trg_audit",
    eventTiming: "BEFORE",
    events: ["INSERT", "UPDATE"],
    functionId: "fn-1",
    condition: "NEW.val > 0",
    forEach: "ROW",
    isConstraint: true,
    deferrable: false,
    initiallyDeferred: false,
  };

  it("passes for valid trigger", () => {
    expect(() => validateTrigger(validTrigger, "users")).not.toThrow();
  });

  it("throws when trigger is invalid or lacks required fields", () => {
    expect(() => validateTrigger(null, "users")).toThrow('Invalid trigger in table "users".');
    expect(() => validateTrigger({ id: "" }, "users")).toThrow();
  });

  it("validates eventTiming and events array", () => {
    expect(() =>
      validateTrigger({ ...validTrigger, eventTiming: "INVALID" }, "users"),
    ).toThrow('eventTiming must be "BEFORE", "AFTER" or "INSTEAD OF"');

    expect(() =>
      validateTrigger({ ...validTrigger, events: [] }, "users"),
    ).toThrow('events must be a non-empty array');

    expect(() =>
      validateTrigger({ ...validTrigger, events: ["BAD_EVENT"] }, "users"),
    ).toThrow('must be "INSERT", "UPDATE", "DELETE" or "TRUNCATE"');
  });

  it("validates condition, isConstraint, deferrable, initiallyDeferred boolean types", () => {
    expect(() =>
      validateTrigger({ ...validTrigger, condition: "" }, "users"),
    ).toThrow('condition must be a non-empty string');

    expect(() =>
      validateTrigger({ ...validTrigger, isConstraint: "true" }, "users"),
    ).toThrow('isConstraint must be a boolean');

    expect(() =>
      validateTrigger({ ...validTrigger, deferrable: "false" }, "users"),
    ).toThrow('deferrable must be a boolean');

    expect(() =>
      validateTrigger({ ...validTrigger, initiallyDeferred: 1 }, "users"),
    ).toThrow('initiallyDeferred must be a boolean');
  });
});

describe("validateDatabaseView", () => {
  const validView = {
    id: "v-1",
    schemaId: "s-1",
    name: "active_users",
    definition: "SELECT * FROM users",
    isMaterialized: false,
    withNoData: false,
    x: 150,
    y: 200,
    triggers: [],
  };

  const schemas = [{ id: "s-1", name: "public" }];

  it("passes for valid view", () => {
    const result = validateDatabaseView(validView, schemas);
    expect(result.id).toBe("v-1");
    expect(result.x).toBe(150);
    expect(result.y).toBe(200);
  });

  it("throws when view definition is invalid or schema does not exist", () => {
    expect(() => validateDatabaseView(null, schemas)).toThrow("Invalid view definition.");
    expect(() =>
      validateDatabaseView({ ...validView, schemaId: "missing-schema" }, schemas),
    ).toThrow('Schema with id "missing-schema" does not exist.');
  });

  it("throws when isMaterialized or coordinates are invalid", () => {
    expect(() =>
      validateDatabaseView({ ...validView, isMaterialized: "false" }, schemas),
    ).toThrow('isMaterialized must be a boolean');

    expect(() =>
      validateDatabaseView({ ...validView, withNoData: "false" }, schemas),
    ).toThrow('withNoData must be a boolean');

    expect(() =>
      validateDatabaseView({ ...validView, x: "not-a-number" }, schemas),
    ).toThrow('coordinates x and y must be numbers');
  });
});
