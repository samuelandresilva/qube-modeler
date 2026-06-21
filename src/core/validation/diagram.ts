import { isObject, validateRequiredString } from "./primitives";

export function validateDiagram(project: Record<string, unknown>): void {
  if (!isObject(project.diagram))
    throw new Error("Project diagram is required.");
  const nodes = project.diagram.tableNodes;
  if (!Array.isArray(nodes))
    throw new Error("Project diagram tableNodes must be an array.");
  const schemas = project.schemas as Array<{ tables: Array<{ id: string }> }>;
  const tableIds = new Set(
    schemas.flatMap((schema) => schema.tables.map((table) => table.id)),
  );
  const diagramIds = new Set<string>();

  for (const node of nodes) {
    if (!isObject(node))
      throw new Error("Project diagram table node must be an object.");
    validateRequiredString(node.tableId, "Diagram table node tableId");
    const tableId = node.tableId as string;
    if (!tableIds.has(tableId))
      throw new Error(
        `Diagram table node references unknown table id "${tableId}".`,
      );
    if (diagramIds.has(tableId))
      throw new Error(
        `Diagram table node for table id "${tableId}" is duplicated.`,
      );
    diagramIds.add(tableId);
    if (!isObject(node.position))
      throw new Error(`Diagram table node "${tableId}" position is required.`);
    if (
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    )
      throw new Error(
        `Diagram table node "${tableId}" position must contain numeric x and y.`,
      );
  }
}
