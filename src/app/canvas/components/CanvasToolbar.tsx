import type { DatabaseSchema } from "@/core/model";
import { useTranslation } from "react-i18next";
import {
  FileCode2,
  FilePlus2,
  FolderOpen,
  FolderX,
  Grid2X2Plus,
  Redo2,
  Save,
  SaveAll,
  Scan,
  ScanEye,
  Layers,
  Magnet,
  StickyNote,
  Undo2,
} from "lucide-react";

export type CanvasToolbarProps = {
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  isFileOperationLoading: boolean;
  onFitView: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  onAddTable: () => void;
  isAddingTable: boolean;
  onAddView: () => void;
  isAddingView: boolean;
  onExportJson?: () => void;
  onGenerateSql: () => void;
  schemas: DatabaseSchema[];
  activeSchemaId: string | null;
  onActiveSchemaChange: (schemaId: string | null) => void;
  onAddSubjectArea?: () => void;
  onAddTextNote?: () => void;
  isAddingSubjectArea?: boolean;
  isAddingTextNote?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function CanvasToolbar({
  onNewProject,
  onOpenProject,
  onCloseProject,
  onSaveProject,
  onSaveProjectAs,
  isFileOperationLoading,
  onFitView,
  snapToGrid = true,
  onToggleSnapToGrid,
  onAddTable,
  isAddingTable,
  onAddView,
  isAddingView,
  onGenerateSql,
  schemas,
  activeSchemaId,
  onActiveSchemaChange,
  onAddSubjectArea,
  onAddTextNote,
  isAddingSubjectArea = false,
  isAddingTextNote = false,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasToolbarProps) {
  const { t } = useTranslation(["canvas", "common"]);

  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar__actions">
        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.newProject")}
          aria-label={t("canvas:toolbar.newProject")}
          onClick={onNewProject}
          disabled={isFileOperationLoading}
        >
          <FilePlus2 size={18} strokeWidth={2.4} color="oklch(71.4% 0.203 305.504)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.openProject")}
          aria-label={t("canvas:toolbar.openProject")}
          onClick={onOpenProject}
          disabled={isFileOperationLoading}
        >
          <FolderOpen size={18} strokeWidth={2.4} color="oklch(75% 0.183 55.934)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.closeProject")}
          aria-label={t("canvas:toolbar.closeProject")}
          onClick={onCloseProject}
          disabled={isFileOperationLoading}
        >
          <FolderX size={18} strokeWidth={2.4} color="oklch(70.4% 0.191 22.216)" />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.saveProject")}
          aria-label={t("canvas:toolbar.saveProject")}
          onClick={onSaveProject}
          disabled={isFileOperationLoading}
        >
          <Save size={18} strokeWidth={2.4} color="oklch(62.3% 0.214 259.815)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.saveProjectAs")}
          aria-label={t("canvas:toolbar.saveProjectAs")}
          onClick={onSaveProjectAs}
          disabled={isFileOperationLoading}
        >
          <SaveAll size={18} strokeWidth={2.4} color="oklch(58.8% 0.158 241.966)" />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.undo")}
          aria-label={t("canvas:toolbar.undo")}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 size={18} strokeWidth={2.4} />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.redo")}
          aria-label={t("canvas:toolbar.redo")}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 size={18} strokeWidth={2.4} />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <div className="canvas-toolbar__schema-select-container">
          <span className="canvas-toolbar__schema-select-label">{t("canvas:toolbar.schema")}</span>
          <select
            className="canvas-toolbar__schema-select"
            value={activeSchemaId || ""}
            onChange={(e) => onActiveSchemaChange(e.target.value || null)}
            disabled={schemas.length === 0}
          >
            {schemas.length === 0 ? (
              <option value="">{t("canvas:toolbar.noSchemas")}</option>
            ) : (
              schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.fitView")}
          aria-label={t("canvas:toolbar.fitView")}
          onClick={onFitView}
        >
          <Scan size={17} strokeWidth={2.4} />
        </button>

        {onToggleSnapToGrid && (
          <button
            className={`canvas-toolbar__icon-button ${snapToGrid ? "canvas-toolbar__button--active" : ""}`}
            type="button"
            title={snapToGrid ? t("canvas:toolbar.snapToGridDisable") : t("canvas:toolbar.snapToGridEnable")}
            aria-label="Toggle snap to grid"
            onClick={onToggleSnapToGrid}
          >
            <Magnet size={18} strokeWidth={2.4} color={snapToGrid ? "oklch(78% 0.18 190)" : "currentColor"} />
          </button>
        )}

        <button
          className={`canvas-toolbar__icon-button ${isAddingTable ? "canvas-toolbar__button--active" : ""}`}
          type="button"
          title={t("canvas:toolbar.addTable")}
          aria-label={t("canvas:toolbar.addTable")}
          onClick={onAddTable}
          disabled={!activeSchemaId}
        >
          <Grid2X2Plus size={18} strokeWidth={2.4} color="oklch(76.5% 0.177 163.223)" />
        </button>

        <button
          className={`canvas-toolbar__icon-button ${isAddingView ? "canvas-toolbar__button--active" : ""}`}
          type="button"
          title={t("canvas:toolbar.addView")}
          aria-label={t("canvas:toolbar.addView")}
          onClick={onAddView}
          disabled={!activeSchemaId}
        >
          <ScanEye size={18} strokeWidth={2.4} color="oklch(75.5% 0.177 280)" />
        </button>

        <button
          className={`canvas-toolbar__icon-button ${isAddingSubjectArea ? "canvas-toolbar__button--active" : ""}`}
          type="button"
          title={t("canvas:toolbar.addSubjectArea")}
          aria-label={t("canvas:toolbar.addSubjectArea")}
          onClick={onAddSubjectArea}
        >
          <Layers size={18} strokeWidth={2.4} color="oklch(65% 0.203 205.504)" />
        </button>

        <button
          className={`canvas-toolbar__icon-button ${isAddingTextNote ? "canvas-toolbar__button--active" : ""}`}
          type="button"
          title={t("canvas:toolbar.addTextNote")}
          aria-label={t("canvas:toolbar.addTextNote")}
          onClick={onAddTextNote}
        >
          <StickyNote size={18} strokeWidth={2.4} color="oklch(80% 0.16 85)" />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title={t("canvas:toolbar.generateSql")}
          aria-label={t("canvas:toolbar.generateSql")}
          onClick={onGenerateSql}
          disabled={isFileOperationLoading}
        >
          <FileCode2 size={18} strokeWidth={2.4} color="oklch(89.7% 0.196 126.665)" />
        </button>
      </div>
    </div>
  );
}
