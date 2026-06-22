import { ChevronDown, FolderTree, Plus } from "lucide-react";
import { useState } from "react";
import type { DatabaseProject } from "@/core/model";
import { SchemaTreeItem } from "./SchemaTreeItem";
import { SidebarContextMenu } from "./SidebarContextMenu";

type Props = {
  project: DatabaseProject;
  onRenameProject: (name: string) => void;
  onAddSchema: () => void;
  onEditSchema: (schemaId: string) => void;
  onDeleteSchema: (schemaId: string) => void;
  onAddSequence: (schemaId: string) => void;
  onEditSequence: (schemaId: string, sequenceId: string) => void;
  onDeleteSequence: (schemaId: string, sequenceId: string) => void;
  onSeeTableOnDiagram: (schemaId: string, tableId: string) => void;
  onDeleteTable: (schemaId: string, tableId: string) => void;
};

export function CanvasSidebar({
  project,
  onRenameProject,
  onAddSchema,
  ...actions
}: Props) {
  const [expanded, setExpanded] = useState(true);
  return (
    <aside className="canvas-sidebar">
      <div className="canvas-sidebar__header">
        <span className="canvas-sidebar__label">Project</span>
        <input
          className="canvas-sidebar__project-name"
          value={project.name}
          onChange={(event) => onRenameProject(event.target.value)}
          placeholder="Project name"
        />
      </div>
      <div className="canvas-sidebar__tree">
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
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown
              size={13}
              className="canvas-sidebar__chevron"
              data-expanded={expanded}
            />
            <FolderTree size={15} className="canvas-sidebar__item-icon" />
            <span>schemas</span>
          </div>
        </SidebarContextMenu>
        {expanded && (
          <div className="canvas-sidebar__tree-group">
            {project.schemas.map((schema) => (
              <SchemaTreeItem key={schema.id} schema={schema} {...actions} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
