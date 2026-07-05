import { useState } from "react";
import { MultiColumnSelect } from "@/app/shared/components/MultiColumnSelect";
import type { DatabaseTable, CheckConstraint } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  table: DatabaseTable;
  current?: CheckConstraint;
  onClose: () => void;
  onSubmit: (input: { name: string; expression: string; columnIds: string[] }) => void;
  onDelete?: () => void;
};

function getSuggestedName(table: DatabaseTable): string {
  const existingNames = new Set(
    (table.checkConstraints ?? []).map((chk) => chk.name.toLowerCase()),
  );
  const baseName = `chk_${table.name}_check`;
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (existingNames.has(`${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
}

export function CheckConstraintDialog({
  table,
  current,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState(current?.name ?? getSuggestedName(table));
  const [expression, setExpression] = useState(current?.expression ?? "");
  const [columnIds, setColumnIds] = useState<string[]>(current?.columnIds ?? []);

  const normalizedName = name.trim();
  const normalizedExpression = expression.trim();

  const duplicate = (table.checkConstraints ?? []).some(
    (item) =>
      item.id !== current?.id &&
      item.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);

  const canSubmit =
    normalizedName !== "" &&
    normalizedExpression !== "" &&
    valid &&
    !reserved &&
    !duplicate;

  const columnNameToId = new Map(table.columns.map((c) => [c.name, c.id]));
  const columnIdToName = new Map(table.columns.map((c) => [c.id, c.name]));

  return (
    <CanvasModal
      title={current ? `Edit CHECK constraint · ${current.name}` : "Add CHECK constraint"}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="chk_table_column"
          />
        </label>
        <label>
          <span>Expression</span>
          <textarea
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            placeholder="age BETWEEN 0 AND 120"
          />
        </label>
        <label>
          <span>Involved columns</span>
          <MultiColumnSelect
            availableColumns={table.columns.map((column) => column.name)}
            selectedColumns={columnIds.map((id) => columnIdToName.get(id) ?? "")}
            onChange={(names) =>
              setColumnIds(names.map((name) => columnNameToId.get(name) ?? ""))
            }
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            A CHECK constraint with this name already exists on this table.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Name cannot be a PostgreSQL reserved word.
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              Delete CHECK constraint
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                name: normalizedName,
                expression: normalizedExpression,
                columnIds,
              })
            }
          >
            {current ? "Save" : "Create"} CHECK constraint
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
