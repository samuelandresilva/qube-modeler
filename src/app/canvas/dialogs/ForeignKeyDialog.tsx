import { useState } from "react";
import type {
  DatabaseForeignKey,
  DatabaseForeignKeyInput,
  DatabaseProject,
  DatabaseTable,
  ForeignKeyAction,
} from "@/core/model";
import { FOREIGN_KEY_ACTIONS } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  project: DatabaseProject;
  sourceTable: DatabaseTable;
  foreignKey?: DatabaseForeignKey;
  onClose: () => void;
  onSubmit: (input: DatabaseForeignKeyInput) => void;
  onDelete?: () => void;
};

type ColumnPair = {
  sourceColumn: string;
  targetColumn: string;
};

export function ForeignKeyDialog({
  project,
  sourceTable,
  foreignKey,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const firstSchema = project.schemas[0];
  const firstTable = firstSchema?.tables[0];

  const [name, setName] = useState(
    foreignKey?.name ?? `fk_${sourceTable.name}_`,
  );
  const [targetSchema, setTargetSchema] = useState(
    foreignKey?.targetSchema ?? firstSchema?.name ?? "",
  );
  const [targetTable, setTargetTable] = useState(
    foreignKey?.targetTable ?? firstTable?.name ?? "",
  );

  const [pairs, setPairs] = useState<ColumnPair[]>(() => {
    if (foreignKey && foreignKey.sourceColumns.length > 0) {
      return foreignKey.sourceColumns.map((srcCol, idx) => ({
        sourceColumn: srcCol,
        targetColumn: foreignKey.targetColumns[idx] ?? "",
      }));
    }
    return [
      {
        sourceColumn: sourceTable.columns[0]?.name ?? "",
        targetColumn: firstTable?.columns[0]?.name ?? "",
      },
    ];
  });

  const [onUpdate, setOnUpdate] = useState<ForeignKeyAction>(
    foreignKey?.onUpdate ?? "NO ACTION",
  );
  const [onDeleteAction, setOnDeleteAction] = useState<ForeignKeyAction>(
    foreignKey?.onDelete ?? "NO ACTION",
  );
  const [comment, setComment] = useState(foreignKey?.comment ?? "");

  const selectedSchema = project.schemas.find(
    (schema) => schema.name === targetSchema,
  );
  const selectedTable = selectedSchema?.tables.find(
    (table) => table.name === targetTable,
  );

  const normalizedName = name.trim();
  const duplicate = sourceTable.foreignKeys.some(
    (item) => item.id !== foreignKey?.id && item.name === normalizedName,
  );
  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);

  // Validação dos pares de colunas
  const hasEmptyColumns = pairs.some(
    (p) => !p.sourceColumn.trim() || !p.targetColumn.trim(),
  );

  const sourceColumnNames = pairs.map((p) => p.sourceColumn.trim()).filter(Boolean);
  const targetColumnNames = pairs.map((p) => p.targetColumn.trim()).filter(Boolean);

  const hasDuplicateSourceCols =
    new Set(sourceColumnNames).size !== sourceColumnNames.length;
  const hasDuplicateTargetCols =
    new Set(targetColumnNames).size !== targetColumnNames.length;

  const canSubmit =
    normalizedName !== "" &&
    valid &&
    !reserved &&
    !duplicate &&
    pairs.length > 0 &&
    !hasEmptyColumns &&
    !hasDuplicateSourceCols &&
    !hasDuplicateTargetCols &&
    !!targetSchema &&
    !!targetTable;

  const handleUpdatePair = (
    index: number,
    field: "sourceColumn" | "targetColumn",
    value: string,
  ) => {
    setPairs((current) =>
      current.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
    );
  };

  const handleAddPair = () => {
    // Sugere a próxima coluna da tabela de origem que ainda não foi mapeada
    const usedSourceCols = new Set(pairs.map((p) => p.sourceColumn));
    const nextUnusedSource = sourceTable.columns.find(
      (c) => !usedSourceCols.has(c.name),
    );

    const usedTargetCols = new Set(pairs.map((p) => p.targetColumn));
    const nextUnusedTarget = selectedTable?.columns.find(
      (c) => !usedTargetCols.has(c.name),
    );

    setPairs((current) => [
      ...current,
      {
        sourceColumn: nextUnusedSource?.name ?? sourceTable.columns[0]?.name ?? "",
        targetColumn: nextUnusedTarget?.name ?? selectedTable?.columns[0]?.name ?? "",
      },
    ]);
  };

  const handleRemovePair = (index: number) => {
    setPairs((current) => current.filter((_, i) => i !== index));
  };

  return (
    <CanvasModal
      title={
        foreignKey ? `Edit foreign key · ${foreignKey.name}` : "Add foreign key"
      }
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="fk_table_column"
          />
        </label>

        <div className="canvas-modal-form__row">
          <label>
            <span>Target schema</span>
            <select
              value={targetSchema}
              onChange={(event) => {
                const nextName = event.target.value;
                const nextSchema = project.schemas.find(
                  (schema) => schema.name === nextName,
                );
                const nextTable = nextSchema?.tables[0];
                setTargetSchema(nextName);
                setTargetTable(nextTable?.name ?? "");
                setPairs((curr) =>
                  curr.map((p) => ({
                    ...p,
                    targetColumn: nextTable?.columns[0]?.name ?? "",
                  })),
                );
              }}
            >
              <option value="">Select target schema</option>
              {project.schemas.map((schema) => (
                <option value={schema.name} key={schema.id}>
                  {schema.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Target table</span>
            <select
              value={targetTable}
              onChange={(event) => {
                const nextName = event.target.value;
                const nextTable = selectedSchema?.tables.find(
                  (table) => table.name === nextName,
                );
                setTargetTable(nextName);
                setPairs((curr) =>
                  curr.map((p) => ({
                    ...p,
                    targetColumn: nextTable?.columns[0]?.name ?? "",
                  })),
                );
              }}
            >
              <option value="">Select target table</option>
              {selectedSchema?.tables.map((table) => (
                <option value={table.name} key={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            background: "rgba(2, 6, 23, 0.4)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              Mapped Columns ({pairs.length})
            </span>
            <button
              type="button"
              onClick={handleAddPair}
              style={{
                background: "transparent",
                border: "1px solid var(--color-border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-accent)",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              + Add Column
            </button>
          </div>

          {pairs.map((pair, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: pairs.length > 1 ? "1fr auto 1fr auto" : "1fr auto 1fr",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <select
                value={pair.sourceColumn}
                onChange={(e) =>
                  handleUpdatePair(index, "sourceColumn", e.target.value)
                }
              >
                <option value="">Source column</option>
                {sourceTable.columns.map((column) => (
                  <option value={column.name} key={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>

              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "14px",
                  userSelect: "none",
                }}
              >
                ➜
              </span>

              <select
                value={pair.targetColumn}
                onChange={(e) =>
                  handleUpdatePair(index, "targetColumn", e.target.value)
                }
              >
                <option value="">Target column</option>
                {selectedTable?.columns.map((column) => (
                  <option value={column.name} key={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>

              {pairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePair(index)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-danger, #ef4444)",
                    fontSize: "14px",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: "4px",
                  }}
                  title="Remove column pair"
                  aria-label="Remove column pair"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="canvas-modal-form__row">
          <ActionSelect
            label="On update"
            value={onUpdate}
            onChange={setOnUpdate}
          />
          <ActionSelect
            label="On delete"
            value={onDeleteAction}
            onChange={setOnDeleteAction}
          />
        </div>

        <label>
          <span>Comment / Documentation</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Describe the foreign key's purpose..."
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>

        {duplicate && (
          <p className="canvas-modal-error">
            A foreign key with this name already exists.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Foreign key name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Foreign key name cannot be a PostgreSQL reserved word.
          </p>
        )}
        {hasEmptyColumns && (
          <p className="canvas-modal-error">
            All mapped column pairs must have both source and target columns selected.
          </p>
        )}
        {hasDuplicateSourceCols && (
          <p className="canvas-modal-error">
            Cannot map the same source column multiple times in the same foreign key.
          </p>
        )}
        {hasDuplicateTargetCols && (
          <p className="canvas-modal-error">
            Cannot map the same target column multiple times in the same foreign key.
          </p>
        )}

        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              Delete FK
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
                sourceColumns: pairs.map((p) => p.sourceColumn.trim()),
                targetSchema,
                targetTable,
                targetColumns: pairs.map((p) => p.targetColumn.trim()),
                onUpdate,
                onDelete: onDeleteAction,
                comment: comment.trim() === "" ? undefined : comment.trim(),
              })
            }
          >
            {foreignKey ? "Save FK" : "Create foreign key"}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}

function ActionSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ForeignKeyAction;
  onChange: (value: ForeignKeyAction) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ForeignKeyAction)}
      >
        {FOREIGN_KEY_ACTIONS.map((action) => (
          <option value={action} key={action}>
            {action}
          </option>
        ))}
      </select>
    </label>
  );
}
