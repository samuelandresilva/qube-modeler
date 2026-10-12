import { ChevronDown, Database, FolderTree, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseProject } from "@/core/model";
import { getProjectDisplayName } from "@/core/qbm/qbm-file";
import { SchemaTreeItem } from "./SchemaTreeItem";
import { SidebarContextMenu } from "./SidebarContextMenu";

type Props = {
  project: DatabaseProject;
  filePath: string | null;
  onAddSchema: () => void;
  onEditSchema: (schemaId: string) => void;
  onDeleteSchema: (schemaId: string) => void;
  onAddSequence: (schemaId: string) => void;
  onEditSequence: (schemaId: string, sequenceId: string) => void;
  onDeleteSequence: (schemaId: string, sequenceId: string) => void;
  onSeeTableOnDiagram: (schemaId: string, tableId: string) => void;
  onDeleteTable: (schemaId: string, tableId: string) => void;
  onViewTableSql?: (schemaId: string, tableId: string) => void;
  onAddFunction: (schemaId: string) => void;
  onEditFunction: (schemaId: string, functionId: string) => void;
  onDeleteFunction: (schemaId: string, functionId: string) => void;
  onDeleteView?: (schemaId: string, viewId: string) => void;
  onViewFlyway?: () => void;
  onOpenSettings?: () => void;
};

export function CanvasSidebar({
  project,
  filePath,
  onAddSchema,
  onViewFlyway,
  onOpenSettings,
  ...actions
}: Props) {
  const { t } = useTranslation(["canvas", "common"]);
  const [projectExpanded, setProjectExpanded] = useState(true);
  const [schemasExpanded, setSchemasExpanded] = useState(true);
  return (
    <aside className="canvas-sidebar">
      <div className="canvas-sidebar__header" style={{ display: "flex", gap: "6px" }}>
        <button
          className="canvas-sidebar__flyway-button"
          type="button"
          onClick={onViewFlyway}
          style={{ flex: 1 }}
        >
          <Database size={14} />
          <span>{t("sidebar.migrations")}</span>
        </button>
        {onOpenSettings && (
          <button
            className="canvas-sidebar__flyway-button"
            type="button"
            onClick={onOpenSettings}
            title={t("common:settings.title")}
            aria-label={t("common:settings.title")}
            style={{ width: "32px", padding: 0, justifyContent: "center" }}
          >
            <Settings size={14} />
          </button>
        )}
      </div>
      <div className="canvas-sidebar__tree">
        <div
          className="canvas-sidebar__tree-item canvas-sidebar__tree-item--project-root"
          onClick={() => setProjectExpanded((value) => !value)}
        >
          <ChevronDown
            size={13}
            className="canvas-sidebar__chevron"
            data-expanded={projectExpanded}
          />
          <Database size={15} className="canvas-sidebar__item-icon" />
          <span title={filePath || undefined} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getProjectDisplayName(filePath)}
          </span>
        </div>

        {projectExpanded && (
          <div className="canvas-sidebar__tree-group">
            <SidebarContextMenu
              actions={[
                {
                  label: t("sidebar.addSchema"),
                  icon: <Plus size={14} />,
                  onSelect: onAddSchema,
                },
              ]}
            >
              <div
                className="canvas-sidebar__tree-item canvas-sidebar__tree-item--schema-root"
                onClick={() => setSchemasExpanded((value) => !value)}
              >
                <ChevronDown
                  size={13}
                  className="canvas-sidebar__chevron"
                  data-expanded={schemasExpanded}
                />
                <FolderTree size={15} className="canvas-sidebar__item-icon" />
                <span>{t("sidebar.schemas")}</span>
              </div>
            </SidebarContextMenu>
            {schemasExpanded && (
              <div className="canvas-sidebar__tree-group">
                {project.schemas.map((schema) => (
                  <SchemaTreeItem
                    key={schema.id}
                    schema={schema}
                    projectFunctions={project.functions ?? []}
                    projectViews={project.views ?? []}
                    {...actions}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
