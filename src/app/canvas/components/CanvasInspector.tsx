import { useTranslation } from "react-i18next";
import { FileCode2, Trash2, X } from "lucide-react";
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
  onViewTableSql?: () => void;
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
  onAddTrigger?: () => void;
  onEditTrigger?: (id: string) => void;
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
  onViewTableSql,
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
  subjectArea,
  textNote,
  onRenameSubjectArea,
  onChangeSubjectAreaColor,
  onDeleteSubjectArea,
  onChangeTextNoteContent,
  onChangeTextNoteColor,
  onDeleteTextNote,
}: Props) {
  const { t } = useTranslation("canvas");

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
          <span>{t("inspector.subjectArea")}</span>
          <button type="button" onClick={onClose} title={t("inspector.close")} aria-label={t("inspector.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">{t("inspector.name")}</label>
          <input
            className="canvas-inspector__title-input"
            value={subjectArea.name}
            onChange={(event) => onRenameSubjectArea?.(event.target.value)}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "16px" }}>
          <label className="canvas-inspector__field-label">{t("inspector.color")}</label>
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
          <span>{t("inspector.deleteSubjectArea")}</span>
        </button>
      </aside>
    );
  }

  if (textNote) {
    return (
      <aside className="canvas-inspector">
        <div className="canvas-inspector__header">
          <span>{t("inspector.textNote")}</span>
          <button type="button" onClick={onClose} title={t("inspector.close")} aria-label={t("inspector.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">{t("inspector.content")}</label>
          <textarea
            className="canvas-inspector__textarea"
            value={textNote.content}
            onChange={(event) => onChangeTextNoteContent?.(event.target.value)}
            placeholder={t("inspector.contentPlaceholder")}
            rows={5}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "16px" }}>
          <label className="canvas-inspector__field-label">{t("inspector.color")}</label>
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
          <span>{t("inspector.deleteTextNote")}</span>
        </button>
      </aside>
    );
  }

  if (view) {
    return (
      <aside className="canvas-inspector">
        <div className="canvas-inspector__header">
          <span>{t("inspector.view")}</span>
          <button type="button" onClick={onClose} title={t("inspector.close")} aria-label={t("inspector.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="canvas-inspector__field-group">
          <label className="canvas-inspector__field-label">{t("inspector.name")}</label>
          <input
            className="canvas-inspector__title-input"
            value={view.name}
            onChange={(event) => onRenameView?.(event.target.value)}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
          <label className="canvas-inspector__field-label">{t("inspector.comment")}</label>
          <textarea
            className="canvas-inspector__textarea"
            value={view.comment ?? ""}
            onChange={(event) => onChangeViewComment?.(event.target.value)}
            placeholder={t("inspector.viewCommentPlaceholder")}
            rows={3}
          />
        </div>

        <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
          <label className="canvas-inspector__field-label">{t("inspector.schema")}</label>
          <select
            className="canvas-inspector__select"
            value={currentSchemaId}
            onChange={(event) => onChangeSchema?.(event.target.value)}
            disabled={!schemas || schemas.length === 0}
          >
            {!schemas || schemas.length === 0 ? (
              <option value="">{t("inspector.noSchemas")}</option>
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
            <span>{t("inspector.materializedView")}</span>
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
              <span>{t("inspector.withNoData")}</span>
            </label>
          </div>
        )}

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onEditViewDefinition}
          style={{ marginTop: "12px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.2)" }}
        >
          <span>{t("inspector.editViewDefinition")}</span>
        </button>

        <button
          className="canvas-inspector__danger-button"
          type="button"
          onClick={onDeleteView}
          style={{ marginTop: "16px" }}
        >
          <Trash2 size={15} strokeWidth={2.4} />
          <span>{t("inspector.deleteView")}</span>
        </button>

        <InspectorSection
          title={t("inspector.triggers")}
          addLabel={t("inspector.addTrigger")}
          emptyLabel={t("inspector.noTriggers")}
          items={(view.triggers ?? []).map((item) => ({
            id: item.id,
            label: item.name,
            detail: `${item.eventTiming} ${item.events.join(" OR ")}`,
          }))}
          onAdd={onAddTrigger ?? (() => {})}
          onEdit={onEditTrigger ?? (() => {})}
        />
      </aside>
    );
  }

  if (!table) return null;
  return (
    <aside className="canvas-inspector">
      <div className="canvas-inspector__header">
        <span>{t("inspector.table")}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {onViewTableSql && (
            <button
              type="button"
              onClick={onViewTableSql}
              title={t("inspector.viewTableSql")}
              aria-label={t("inspector.viewTableSql")}
            >
              <FileCode2 size={16} />
            </button>
          )}
          <button
            type="button"
            className="canvas-inspector__header-delete-btn"
            onClick={onDeleteTable}
            title={t("inspector.deleteTable")}
            aria-label={t("inspector.deleteTable")}
          >
            <Trash2 size={16} />
          </button>
          <button type="button" onClick={onClose} title={t("inspector.close")} aria-label={t("inspector.close")}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="canvas-inspector__field-group">
        <label className="canvas-inspector__field-label">{t("inspector.name")}</label>
        <input
          className="canvas-inspector__title-input"
          value={table.name}
          onChange={(event) => onRenameTable(event.target.value)}
        />
      </div>

      <div className="canvas-inspector__field-group" style={{ marginTop: "12px" }}>
        <label className="canvas-inspector__field-label">{t("inspector.schema")}</label>
        <select
          className="canvas-inspector__select"
          value={currentSchemaId}
          onChange={(event) => onChangeSchema?.(event.target.value)}
          disabled={!schemas || schemas.length === 0}
        >
          {!schemas || schemas.length === 0 ? (
             <option value="">{t("inspector.noSchemas")}</option>
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
        <label className="canvas-inspector__field-label">{t("inspector.comment")}</label>
        <textarea
          className="canvas-inspector__textarea"
          value={table.comment ?? ""}
          onChange={(event) => onChangeTableComment?.(event.target.value)}
          placeholder={t("inspector.tableCommentPlaceholder")}
          rows={3}
        />
      </div>

      {table.columns.some((c) => c.primaryKey) && (
        <details style={{ marginTop: "12px" }}>
          <summary style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer", color: "var(--color-text-muted)", outline: "none", userSelect: "none" }}>
            {t("inspector.primaryKeyComment")}
          </summary>
          <div style={{ marginTop: "8px" }}>
            <textarea
              className="canvas-inspector__textarea"
              value={table.primaryKeyComment ?? ""}
              onChange={(event) => onChangePrimaryKeyComment?.(event.target.value)}
              placeholder={t("inspector.primaryKeyCommentPlaceholder")}
              rows={2}
              style={{ fontSize: "12px" }}
            />
          </div>
        </details>
      )}


      <InspectorSection
        title={t("inspector.columns")}
        addLabel={t("inspector.addColumn")}
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
        title={t("inspector.foreignKeys")}
        addLabel={t("inspector.addForeignKey")}
        emptyLabel={t("inspector.noForeignKeys")}
        items={table.foreignKeys.map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.sourceColumns.join(", ")} → ${item.targetTable}.${item.targetColumns.join(", ")}`,
        }))}
        onAdd={onAddForeignKey}
        onEdit={onEditForeignKey}
      />
      <InspectorSection
        title={t("inspector.uniqueConstraints")}
        addLabel={t("inspector.addUniqueConstraint")}
        emptyLabel={t("inspector.noUniqueConstraints")}
        items={table.uniqueConstraints.map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.columns.join(", "),
        }))}
        onAdd={onAddUniqueConstraint}
        onEdit={onEditUniqueConstraint}
      />
      <InspectorSection
        title={t("inspector.checkConstraints")}
        addLabel={t("inspector.addCheckConstraint")}
        emptyLabel={t("inspector.noCheckConstraints")}
        items={(table.checkConstraints ?? []).map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.expression,
        }))}
        onAdd={onAddCheckConstraint}
        onEdit={onEditCheckConstraint}
      />
      <InspectorSection
        title={t("inspector.triggers")}
        addLabel={t("inspector.addTrigger")}
        emptyLabel={t("inspector.noTriggers")}
        items={(table.triggers ?? []).map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.eventTiming} ${item.events.join(" OR ")}`,
        }))}
        onAdd={onAddTrigger ?? (() => {})}
        onEdit={onEditTrigger ?? (() => {})}
      />
      <InspectorSection
        title={t("inspector.indexes")}
        addLabel={t("inspector.addIndex")}
        emptyLabel={t("inspector.noIndexes")}
        items={table.indexes.map((item) => ({
          id: item.id,
          label: item.name,
          detail:
            item.method && item.method !== "btree"
              ? `${item.columns.join(", ")} (${item.method.toUpperCase()})`
              : item.columns.join(", "),
        }))}
        onAdd={onAddIndex}
        onEdit={onEditIndex}
      />
    </aside>
  );
}
