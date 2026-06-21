import { useState } from "react";
import type {
  DatabaseForeignKey,
  DatabaseForeignKeyInput,
  DatabaseProject,
  DatabaseTable,
  ForeignKeyAction,
} from "@/core/model";
import { FOREIGN_KEY_ACTIONS } from "@/core/model";
import { isValidSqlIdentifier } from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  project: DatabaseProject;
  sourceTable: DatabaseTable;
  foreignKey?: DatabaseForeignKey;
  onClose: () => void;
  onSubmit: (input: DatabaseForeignKeyInput) => void;
  onDelete?: () => void;
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
  const [sourceColumn, setSourceColumn] = useState(
    foreignKey?.sourceColumns[0] ?? sourceTable.columns[0]?.name ?? "",
  );
  const [targetSchema, setTargetSchema] = useState(
    foreignKey?.targetSchema ?? firstSchema?.name ?? "",
  );
  const [targetTable, setTargetTable] = useState(
    foreignKey?.targetTable ?? firstTable?.name ?? "",
  );
  const [targetColumn, setTargetColumn] = useState(
    foreignKey?.targetColumns[0] ?? firstTable?.columns[0]?.name ?? "",
  );
  const [onUpdate, setOnUpdate] = useState<ForeignKeyAction>(
    foreignKey?.onUpdate ?? "NO ACTION",
  );
  const [onDeleteAction, setOnDeleteAction] = useState<ForeignKeyAction>(
    foreignKey?.onDelete ?? "NO ACTION",
  );
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
  const canSubmit =
    normalizedName !== "" &&
    valid &&
    !duplicate &&
    !!sourceColumn &&
    !!targetSchema &&
    !!targetTable &&
    !!targetColumn;

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
        <label>
          <span>Source column</span>
          <select
            value={sourceColumn}
            onChange={(event) => setSourceColumn(event.target.value)}
          >
            <option value="">Select source column</option>
            {sourceTable.columns.map((column) => (
              <option value={column.name} key={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
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
              setTargetColumn(nextTable?.columns[0]?.name ?? "");
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
              setTargetColumn(nextTable?.columns[0]?.name ?? "");
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
        <label>
          <span>Target column</span>
          <select
            value={targetColumn}
            onChange={(event) => setTargetColumn(event.target.value)}
          >
            <option value="">Select target column</option>
            {selectedTable?.columns.map((column) => (
              <option value={column.name} key={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
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
                sourceColumns: [sourceColumn],
                targetSchema,
                targetTable,
                targetColumns: [targetColumn],
                onUpdate,
                onDelete: onDeleteAction,
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
