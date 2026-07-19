import { describe, it, expect } from "vitest";
import { createQbmFile, parseQbmFile, QBM_FORMAT, QBM_FORMAT_VERSION } from "./qbm-file";
import { createProjectFixture, createSchemaFixture } from "../test-utils/project-fixtures";
import { validateProject } from "../validation/project";

describe("qbm-file", () => {
  const validProject = validateProject(createProjectFixture({ schemas: [createSchemaFixture()] }));

  describe("createQbmFile", () => {
    it("creates a valid .qbm file structure", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      expect(qbm.format).toBe(QBM_FORMAT);
      expect(qbm.formatVersion).toBe(QBM_FORMAT_VERSION);
      expect(qbm.createdWith.app).toBe("Qube Modeler");
      expect(qbm.createdWith.version).toBe("1.0.0");
      expect(qbm.savedAt).toBeDefined();
      expect(qbm.project).toEqual(validProject);
      expect(qbm.flyway).toEqual({ versions: [] });
    });
  });

  describe("parseQbmFile", () => {
    it("parses a valid .qbm JSON", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      const json = JSON.stringify(qbm);

      const parsed = parseQbmFile(json);
      expect(parsed.project).toEqual(validProject);
      expect(parsed.flyway).toEqual({ versions: [] });
    });

    it("preserves flyway.versions during parse", () => {
      const qbm = createQbmFile(
        validProject,
        {
          versions: [
            {
              id: "v1",
              version: "001",
              description: "Init",
              fileName: "V001__Init.sql",
              createdAt: new Date().toISOString(),
              generatedSql: "CREATE TABLE test();",
              manualScripts: [],
              projectSnapshot: validProject,
            },
          ],
        },
        "1.0.0"
      );
      const json = JSON.stringify(qbm);

      const parsed = parseQbmFile(json);
      expect(parsed.flyway.versions).toHaveLength(1);
      expect(parsed.flyway.versions[0].version).toBe("001");
      expect(parsed.flyway.versions[0].description).toBe("Init");
      expect(parsed.flyway.versions[0].fileName).toBe("V001__Init.sql");
      expect(parsed.flyway.versions[0].generatedSql).toBe("CREATE TABLE test();");
      expect(parsed.flyway.versions[0].manualScripts).toEqual([]);
      expect(parsed.flyway.versions[0].projectSnapshot).toEqual(validProject);
    });

    it("fails when format is not qube-modeler-project", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      const json = JSON.stringify({ ...qbm, format: "invalid-format" });

      expect(() => parseQbmFile(json)).toThrowError("This is not a Qube Modeler project file");
    });

    it("fails when formatVersion is incompatible", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      const json = JSON.stringify({ ...qbm, formatVersion: 999 });

      expect(() => parseQbmFile(json)).toThrowError("Unsupported .qbm format version: 999");
    });

    it("fails and does not discard invalid migrations silently", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      const obj = { ...qbm, flyway: { versions: [{ invalid: "migration" }] } };
      const json = JSON.stringify(obj);

      expect(() => parseQbmFile(json)).toThrowError("The flyway migration history cannot be loaded");
    });

    it("fails when flyway is missing or malformed", () => {
      const qbm = createQbmFile(validProject, { versions: [] }, "1.0.0");
      
      const missingFlyway = { ...qbm };
      // @ts-expect-error forcing delete for test
      delete missingFlyway.flyway;
      expect(() => parseQbmFile(JSON.stringify(missingFlyway))).toThrowError("The .qbm file does not contain a flyway migration history");

      const malformedFlyway = { ...qbm, flyway: "not-an-object" };
      expect(() => parseQbmFile(JSON.stringify(malformedFlyway))).toThrowError("The flyway migration history cannot be loaded: Flyway data must be an object.");
    });
  });
});
