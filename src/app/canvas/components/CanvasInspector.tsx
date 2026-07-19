import { Trash2, X } from "lucide-react";
import type {
  DatabaseSchema,
  DatabaseTable,
  DatabaseView,
  SubjectArea,
  TextNote,
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
  schemas?: DatabaseSchema[];
  currentSchemaId?: string;
  onChangeSchema?: (schemaId: string) => void;
  onRenameView?: (name: string) => void;
  onEditViewDefinition?: () => void;
  onToggleMaterialized?: (isMaterialized: boolean) => void;
  onToggleWithNoData?: (withNoData: boolean) => void;
  onDeleteView?: () => void;
  onChangeTableComment?: (comment: string) => void;
  onChangePrimaryKeyComment?: (comment: string) => void;
  onChangeViewComment?: (comment: string) => void;
  onMoveColumn?: (id: string, direction: "up" | "down") => void;
  subjectAreas?: SubjectArea[];
  onSetSubjectArea?: (subjectAreaId?: string) => void;
  subjectArea?: SubjectArea;
  textNote?: TextNote;
  onRenameSubjectArea?: (name: string) => void;
  onChangeSubjectAreaColor?: (color: string) => void;
  onDeleteSubjectArea?: () => void;
  onChangeTextNoteContent?: (content: string) => void;
  onChangeTextNoteColor?: (color: string) => void;
  onDeleteTextNote?: () => void;
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
  onChangeTableComment,
  onChangePrimaryKeyComment,
  onChangeViewComment,
  onMoveColumn,
  subjectAreas,
  onSetSubjectArea,
  subjectArea,
  textNote,
  onRenameSubjectArea,
  onChangeSubjectAreaColor,
  onDeleteSubjectArea,
  onChangeTextNoteContent,
  onChangeTextNoteColor,
  onDeleteTextNote,
}: Props) {
  const COLOR_PRESETS = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Red", value: "#ef4444" },
    { name: "Yellow", value: "#eab308" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" },
    { name: "Gray", value: "#64748b" },
  ];

  if (subjectArea) {
    return (
      <aside className="canvas-inspector">
        <div className="canvas-inspector__header">
          <span>Subject Area</span>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">Name</label>
          <input
            className="canvas-inspector__title-input"
            value={subjectArea.name}
            onChange={(event) => onRenameSubjectArea?.(event.target.value)}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "16px" }}>
          <label className="canvas-inspector__field-label">Color</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "8px" }}>
            {COLOR_PRESETS.map((preset) => {
              const isActive = subjectArea.color.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChangeSubjectAreaColor?.(preset.value)}
                  style={{
                    height: "28px",
                    background: preset.value,
                    border: isActive ? "2px solid var(--color-text)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 0 0 1px var(--color-accent)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title={preset.name}
                  aria-label={preset.name}
                />
              );
            })}
          </div>
        </div>

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onDeleteSubjectArea}
          style={{ marginTop: "24px" }}
        >
          <Trash2 size={15} />
          <span>Delete Subject Area</span>
        </button>
      </aside>
    );
  }

  if (textNote) {
    return (
      <aside className="canvas-inspector">
        <div className="canvas-inspector__header">
          <span>Text Note</span>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">Content</label>
          <textarea
            className="canvas-inspector__textarea"
            value={textNote.content}
            onChange={(event) => onChangeTextNoteContent?.(event.target.value)}
            placeholder="Type your note content here..."
            rows={5}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "16px" }}>
          <label className="canvas-inspector__field-label">Color</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "8px" }}>
            {COLOR_PRESETS.map((preset) => {
              const isActive = textNote.color.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChangeTextNoteColor?.(preset.value)}
                  style={{
                    height: "28px",
                    background: preset.value,
                    border: isActive ? "2px solid var(--color-text)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 0 0 1px var(--color-accent)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title={preset.name}
                  aria-label={preset.name}
                />
              );
            })}
          </div>
        </div>

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onDeleteTextNote}
          style={{ marginTop: "24px" }}
        >
          <Trash2 size={15} />
          <span>Delete Text Note</span>
        </button>
      </aside>
    );
  }

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
          <label className="canvas-inspector__field-label">Comment / Documentation</label>
          <textarea
            className="canvas-inspector__textarea"
            value={view.comment ?? ""}
            onChange={(event) => onChangeViewComment?.(event.target.value)}
            placeholder="Describe the view's purpose..."
            rows={3}
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

      {subjectAreas && subjectAreas.length > 0 && (
        <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
          <label className="canvas-inspector__field-label">Subject Area</label>
          <select
            className="canvas-inspector__select"
            value={table.subjectAreaId || ""}
            onChange={(event) => onSetSubjectArea?.(event.target.value || undefined)}
          >
            <option value="">None</option>
            {subjectAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
        <label className="canvas-inspector__field-label">Comment / Documentation</label>
        <textarea
          className="canvas-inspector__textarea"
          value={table.comment ?? ""}
          onChange={(event) => onChangeTableComment?.(event.target.value)}
          placeholder="Describe the table's purpose..."
          rows={3}
        />
      </div>

      {table.columns.some((c) => c.primaryKey) && (
        <details style={{ marginTop: "12px" }}>
          <summary style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", color: "var(--color-text-muted)", outline: "none", userSelect: "none" }}>
            PrimaryKey Comment
          </summary>
          <div style={{ marginTop: "8px" }}>
            <textarea
              className="canvas-inspector__textarea"
              value={table.primaryKeyComment ?? ""}
              onChange={(event) => onChangePrimaryKeyComment?.(event.target.value)}
              placeholder="Describe the primary key..."
              rows={2}
              style={{ fontSize: "12px" }}
            />
          </div>
        </details>
      )}

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
          label: `${column.primaryKey ? "🔑 " : "🔹 "}${column.name}`,
          detail: generatePostgresColumnTypeSql(column),
        }))}
        onAdd={onAddColumn}
        onEdit={onEditColumn}
        onMoveUp={(id) => onMoveColumn?.(id, "up")}
        onMoveDown={(id) => onMoveColumn?.(id, "down")}
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
