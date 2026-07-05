import { Trash2, X } from "lucide-react";
import type { DatabaseSchema, DatabaseTable } from "@/core/model";
import { generatePostgresColumnTypeSql } from "@/core/sql/postgres-column-type-sql";
import { InspectorSection } from "./InspectorSection";

type Props = {
  table: DatabaseTable;
  onClose: () => void;
  onRenameTable: (name: string) => void;
  onDeleteTable: () => void;
  onAddColumn: () => void;
  onEditColumn: (id: string) => void;
  onAddForeignKey: () => void;
  onEditForeignKey: (id: string) => void;
  onAddUniqueConstraint: () => void;
  onEditUniqueConstraint: (id: string) => void;
  onAddIndex: () => void;
  onEditIndex: (id: string) => void;
  onAddCheckConstraint: () => void;
  onEditCheckConstraint: (id: string) => void;
  schemas: DatabaseSchema[];
  currentSchemaId: string;
  onChangeSchema: (schemaId: string) => void;
};

export function CanvasInspector({
  table,
  onClose,
  onRenameTable,
  onDeleteTable,
  onAddColumn,
  onEditColumn,
  onAddForeignKey,
  onEditForeignKey,
  onAddUniqueConstraint,
  onEditUniqueConstraint,
  onAddIndex,
  onEditIndex,
  onAddCheckConstraint,
  onEditCheckConstraint,
  schemas,
  currentSchemaId,
  onChangeSchema,
}: Props) {
  return (
    <aside className="canvas-inspector">
      <div className="canvas-inspector__header">
        <span>Table</span>
        <button type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="canvas-inspector__field-group">
        <label className="canvas-inspector__field-label">Name</label>
        <input
          className="canvas-inspector__title-input"
          value={table.name}
          onChange={(event) => onRenameTable(event.target.value)}
        />
      </div>

      <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
        <label className="canvas-inspector__field-label">Schema</label>
        <select
          className="canvas-inspector__select"
          value={currentSchemaId}
          onChange={(event) => onChangeSchema(event.target.value)}
          disabled={schemas.length === 0}
        >
          {schemas.length === 0 ? (
             <option value="">No schemas</option>
          ) : (
            schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </div>

      <button
        className="canvas-inspector__danger-button"
        type="button"
        onClick={onDeleteTable}
        style={{ marginTop: "16px" }}
      >
        <Trash2 size={15} strokeWidth={2.4} />
        <span>Delete table</span>
      </button>
      <InspectorSection
        title="Columns"
        addLabel="Add column"
        items={table.columns.map((column) => ({
          id: column.id,
          label: `${column.primaryKey ? "🔑 " : ""}${column.name}`,
          detail: generatePostgresColumnTypeSql(column),
        }))}
        onAdd={onAddColumn}
        onEdit={onEditColumn}
      />
      <InspectorSection
        title="Foreign keys"
        addLabel="Add foreign key"
        emptyLabel="No foreign keys."
        items={table.foreignKeys.map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.sourceColumns.join(", ")} → ${item.targetTable}.${item.targetColumns.join(", ")}`,
        }))}
        onAdd={onAddForeignKey}
        onEdit={onEditForeignKey}
      />
      <InspectorSection
        title="Unique constraints"
        addLabel="Add unique constraint"
        emptyLabel="No unique constraints."
        items={table.uniqueConstraints.map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.columns.join(", "),
        }))}
        onAdd={onAddUniqueConstraint}
        onEdit={onEditUniqueConstraint}
      />
      <InspectorSection
        title="CHECK constraints"
        addLabel="Add check constraint"
        emptyLabel="No CHECK constraints."
        items={(table.checkConstraints ?? []).map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.expression,
        }))}
        onAdd={onAddCheckConstraint}
        onEdit={onEditCheckConstraint}
      />
      <InspectorSection
        title="Indexes"
        addLabel="Add index"
        emptyLabel="No indexes."
        items={table.indexes.map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.columns.join(", "),
        }))}
        onAdd={onAddIndex}
        onEdit={onEditIndex}
      />
    </aside>
  );
}
