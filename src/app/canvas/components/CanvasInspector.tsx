import { Trash2, X } from "lucide-react";
import type {
  DatabaseSchema,
  DatabaseTable,
  DatabaseView,
} from "@/core/model";
import { generatePostgresColumnTypeSql } from "@/core/sql/postgres-column-type-sql";
import { InspectorSection } from "./InspectorSection";

type Props = {
  table?: DatabaseTable;
  view?: DatabaseView;
  onClose: () => void;
  onRenameTable?: (name: string) => void;
  onDeleteTable?: () => void;
  onAddColumn?: () => void;
  onEditColumn?: (id: string) => void;
  onAddForeignKey?: () => void;
  onEditForeignKey?: (id: string) => void;
  onAddUniqueConstraint?: () => void;
  onEditUniqueConstraint?: (id: string) => void;
  onAddIndex?: () => void;
  onEditIndex?: (id: string) => void;
  onAddCheckConstraint?: () => void;
  onEditCheckConstraint?: (id: string) => void;
  onAddTrigger: () => void;
  onEditTrigger: (id: string) => void;
  schemas: DatabaseSchema[];
  currentSchemaId: string;
  onChangeSchema: (schemaId: string) => void;
  onRenameView?: (name: string) => void;
  onEditViewDefinition?: () => void;
  onToggleMaterialized?: (isMaterialized: boolean) => void;
  onToggleWithNoData?: (withNoData: boolean) => void;
  onDeleteView?: () => void;
};

export function CanvasInspector({
  table,
  view,
  onClose,
  onRenameTable = () => {},
  onDeleteTable = () => {},
  onAddColumn = () => {},
  onEditColumn = () => {},
  onAddForeignKey = () => {},
  onEditForeignKey = () => {},
  onAddUniqueConstraint = () => {},
  onEditUniqueConstraint = () => {},
  onAddIndex = () => {},
  onEditIndex = () => {},
  onAddCheckConstraint = () => {},
  onEditCheckConstraint = () => {},
  onAddTrigger,
  onEditTrigger,
  schemas,
  currentSchemaId,
  onChangeSchema,
  onRenameView,
  onEditViewDefinition,
  onToggleMaterialized,
  onToggleWithNoData,
  onDeleteView,
}: Props) {

  if (view) {
    return (
      <aside className="canvas-inspector">
        <div className="canvas-inspector__header">
          <span>View</span>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">Name</label>
          <input
            className="canvas-inspector__title-input"
            value={view.name}
            onChange={(event) => onRenameView?.(event.target.value)}
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

        <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
          <label className="canvas-inspector__field-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={view.isMaterialized}
              onChange={(event) => onToggleMaterialized?.(event.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Materialized View</span>
          </label>
        </div>

        {view.isMaterialized && (
          <div className="canvas-inspector__field-group" style={{ marginTop: "8px", marginLeft: "16px" }}>
            <label className="canvas-inspector__field-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={view.withNoData ?? false}
                onChange={(event) => onToggleWithNoData?.(event.target.checked)}
                style={{ margin: 0 }}
              />
              <span>WITH NO DATA</span>
            </label>
          </div>
        )}

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onEditViewDefinition}
          style={{ marginTop: "12px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.2)" }}
        >
          <span>Edit SQL Definition</span>
        </button>

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onDeleteView}
          style={{ marginTop: "16px" }}
        >
          <Trash2 size={15} strokeWidth={2.4} />
          <span>Delete view</span>
        </button>

        <InspectorSection
          title="Triggers"
          addLabel="Add trigger"
          emptyLabel="No triggers."
          items={(view.triggers ?? []).map((item) => ({
            id: item.id,
            label: item.name,
            detail: `${item.eventTiming} ${item.events.join(" OR ")}`,
          }))}
          onAdd={onAddTrigger}
          onEdit={onEditTrigger}
        />
      </aside>
    );
  }

  if (!table) return null;
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
        title="Triggers"
        addLabel="Add trigger"
        emptyLabel="No triggers."
        items={(table.triggers ?? []).map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.eventTiming} ${item.events.join(" OR ")}`,
        }))}
        onAdd={onAddTrigger}
        onEdit={onEditTrigger}
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
