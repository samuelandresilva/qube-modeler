import { describe, expect, it } from "vitest";
import {
  hasFlywayVersions,
  getFlywayVersions,
  getLastFlywayVersion,
  getLastFlywayVersionLabel,
  buildFlywayFileName,
  buildFlywayVersionSql,
} from "./qbm-flyway";
import { createQbmFile, type QbmFlywayVersion } from "./qbm-file";
import { createProjectFixture, createSchemaFixture } from "../test-utils/project-fixtures";

describe("qbm-flyway", () => {
  const dummyProject = createProjectFixture({ schemas: [createSchemaFixture()] });

  const emptyQbm = createQbmFile(dummyProject, { versions: [] }, "1.0.0");

  const version1: QbmFlywayVersion = {
    id: "v-1",
    version: "1",
    description: "init_schema",
    fileName: "V1__init_schema.sql",
    createdAt: "2026-01-01T00:00:00.000Z",
    generatedSql: "CREATE TABLE users (id int);",
    manualScripts: [],
    projectSnapshot: dummyProject,
  };

  const version2: QbmFlywayVersion = {
    id: "v-2",
    version: "2",
    description: "add_orders",
    fileName: "V2__add_orders.sql",
    createdAt: "2026-01-02T00:00:00.000Z",
    generatedSql: "CREATE TABLE orders (id int);",
    projectSnapshot: dummyProject,
    manualScripts: [
      {
        id: "m-1",
        name: "seed_users",
        execution: "before",
        order: 2,
        sql: "INSERT INTO users VALUES (1);",
      },
      {
        id: "m-0",
        name: "pre_checks",
        execution: "before",
        order: 1,
        sql: "-- pre checks",
      },
      {
        id: "m-2",
        name: "post_notify",
        execution: "after",
        order: 1,
        sql: "SELECT pg_notify('chan', 'done');",
      },
    ],
  };

  const populatedQbm = createQbmFile(
    dummyProject,
    {
      versions: [version1, version2],
    },
    "1.0.0",
  );

  it("checks if flyway has versions", () => {
    expect(hasFlywayVersions(emptyQbm)).toBe(false);
    expect(hasFlywayVersions(populatedQbm)).toBe(true);
  });

  it("gets all flyway versions", () => {
    expect(getFlywayVersions(emptyQbm)).toHaveLength(0);
    expect(getFlywayVersions(populatedQbm)).toHaveLength(2);
  });

  it("gets last flyway version and label", () => {
    expect(getLastFlywayVersion(emptyQbm)).toBeNull();
    expect(getLastFlywayVersionLabel(emptyQbm)).toBeNull();

    expect(getLastFlywayVersion(populatedQbm)?.id).toBe(version2.id);
    expect(getLastFlywayVersion(populatedQbm)?.fileName).toBe(version2.fileName);
    expect(getLastFlywayVersionLabel(populatedQbm)).toBe("V2__add_orders.sql");
  });

  it("builds sanitized flyway file names", () => {
    expect(buildFlywayFileName("1", "Create Users Table")).toBe("V1__create_users_table.sql");
    expect(buildFlywayFileName("2.1", "Add Index & Constraints!")).toBe("V2.1__add_index_constraints.sql");
    expect(buildFlywayFileName("3", "   ")).toBe("V3__migration.sql");
  });

  it("builds flyway version sql including before and after manual scripts", () => {
    const simpleSql = buildFlywayVersionSql(version1);
    expect(simpleSql).toBe("CREATE TABLE users (id int);");

    const fullSql = buildFlywayVersionSql(version2);
    expect(fullSql).toContain("-- --- BEGIN BEFORE MANUAL SCRIPT: pre_checks ---");
    expect(fullSql).toContain("-- --- BEGIN BEFORE MANUAL SCRIPT: seed_users ---");
    expect(fullSql).toContain("CREATE TABLE orders (id int);");
    expect(fullSql).toContain("-- --- BEGIN AFTER MANUAL SCRIPT: post_notify ---");
  });
});
