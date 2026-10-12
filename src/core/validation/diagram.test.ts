import { describe, expect, it } from "vitest";
import { validateDiagram } from "./diagram";

describe("validateDiagram", () => {
  const validProject = {
    schemas: [
      {
        tables: [{ id: "t-1" }, { id: "t-2" }],
      },
    ],
    diagram: {
      tableNodes: [
        { tableId: "t-1", position: { x: 100, y: 150 } },
        { tableId: "t-2", position: { x: 200, y: 250 } },
      ],
    },
  };

  it("passes for a valid diagram", () => {
    expect(() => validateDiagram(validProject)).not.toThrow();
  });

  it("throws when diagram is missing or invalid", () => {
    expect(() => validateDiagram({})).toThrow("Project diagram is required.");
    expect(() => validateDiagram({ diagram: null })).toThrow("Project diagram is required.");
    expect(() => validateDiagram({ diagram: { tableNodes: "invalid" } })).toThrow(
      "Project diagram tableNodes must be an array.",
    );
  });

  it("throws when a table node references an unknown table id", () => {
    const invalidNodeProject = {
      schemas: [{ tables: [{ id: "t-1" }] }],
      diagram: {
        tableNodes: [{ tableId: "t-unknown", position: { x: 0, y: 0 } }],
      },
    };
    expect(() => validateDiagram(invalidNodeProject)).toThrow(
      'Diagram table node references unknown table id "t-unknown".',
    );
  });

  it("throws when a table node is duplicated", () => {
    const duplicateProject = {
      schemas: [{ tables: [{ id: "t-1" }] }],
      diagram: {
        tableNodes: [
          { tableId: "t-1", position: { x: 0, y: 0 } },
          { tableId: "t-1", position: { x: 10, y: 10 } },
        ],
      },
    };
    expect(() => validateDiagram(duplicateProject)).toThrow(
      'Diagram table node for table id "t-1" is duplicated.',
    );
  });

  it("throws when a table node position is missing or non-numeric", () => {
    const missingPosProject = {
      schemas: [{ tables: [{ id: "t-1" }] }],
      diagram: {
        tableNodes: [{ tableId: "t-1", position: null }],
      },
    };
    expect(() => validateDiagram(missingPosProject)).toThrow(
      'Diagram table node "t-1" position is required.',
    );

    const nonNumericPosProject = {
      schemas: [{ tables: [{ id: "t-1" }] }],
      diagram: {
        tableNodes: [{ tableId: "t-1", position: { x: "100", y: 200 } }],
      },
    };
    expect(() => validateDiagram(nonNumericPosProject)).toThrow(
      'Diagram table node "t-1" position must contain numeric x and y.',
    );
  });
});
