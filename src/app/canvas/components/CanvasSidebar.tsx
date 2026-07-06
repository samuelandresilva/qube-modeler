import { ChevronDown, Database, FolderTree, Plus } from "lucide-react";
import { useState } from "react";
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
  onAddFunction: (schemaId: string) => void;
  onEditFunction: (schemaId: string, functionId: string) => void;
  onDeleteFunction: (schemaId: string, functionId: string) => void;
  onViewFlyway?: () => void;
};

export function CanvasSidebar({
  project,
  filePath,
  onAddSchema,
  onViewFlyway,
  ...actions
}: Props) {
  const [projectExpanded, setProjectExpanded] = useState(true);
  const [schemasExpanded, setSchemasExpanded] = useState(true);
  return (
    <aside className="canvas-sidebar">
      <div className="canvas-sidebar__header">
        <button
          className="canvas-sidebar__flyway-button"
          type="button"
          onClick={onViewFlyway}
        >
          <Database size={14} />
          <span>Migrations</span>
        </button>
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
                  label: "Add schema",
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
                <span>schemas</span>
              </div>
            </SidebarContextMenu>
            {schemasExpanded && (
              <div className="canvas-sidebar__tree-group">
                {project.schemas.map((schema) => (
                  <SchemaTreeItem
                    key={schema.id}
                    schema={schema}
                    projectFunctions={project.functions ?? []}
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
