import {
  Braces,
  ChevronDown,
  Database,
  Pen,
  Plus,
  Rows3,
  Search,
  Table2,
  Trash2,
  Cpu,
} from "lucide-react";
import { useState } from "react";
import type { DatabaseSchema, DatabaseFunction } from "@/core/model";
import { SidebarContextMenu } from "./SidebarContextMenu";

type Props = {
  schema: DatabaseSchema;
  projectFunctions: DatabaseFunction[];
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
};

export function SchemaTreeItem({
  schema,
  projectFunctions,
  onEditSchema,
  onDeleteSchema,
  onAddSequence,
  onEditSequence,
  onDeleteSequence,
  onSeeTableOnDiagram,
  onDeleteTable,
  onAddFunction,
  onEditFunction,
  onDeleteFunction,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [sequencesExpanded, setSequencesExpanded] = useState(true);
  const [functionsExpanded, setFunctionsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const schemaFunctions = (projectFunctions ?? []).filter(
    (fn) => fn.schemaId === schema.id
  );
  return (
    <div className="canvas-sidebar__schema">
      <SidebarContextMenu
        actions={[
          {
            label: "Edit schema",
            icon: <Pen size={14} />,
            onSelect: () => onEditSchema(schema.id),
          },
          {
            label: "Delete schema",
            icon: <Trash2 size={14} />,
            danger: true,
            onSelect: () => onDeleteSchema(schema.id),
          },
        ]}
      >
        <div
          className="canvas-sidebar__tree-item canvas-sidebar__tree-item--schema"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            size={13}
            className="canvas-sidebar__chevron"
            data-expanded={expanded}
          />
          <Database size={15} className="canvas-sidebar__item-icon" />
          <span>{schema.name}</span>
        </div>
      </SidebarContextMenu>
      {expanded && (
        <div className="canvas-sidebar__tree-group">
          <SidebarContextMenu
            actions={[
              {
                label: "Add sequence",
                icon: <Plus size={14} />,
                onSelect: () => onAddSequence(schema.id),
              },
            ]}
          >
            <div
              className="canvas-sidebar__tree-item canvas-sidebar__tree-item--folder"
              onClick={() => setSequencesExpanded((value) => !value)}
            >
              <ChevronDown
                size={13}
                className="canvas-sidebar__chevron"
                data-expanded={sequencesExpanded}
              />
              <Rows3 size={15} className="canvas-sidebar__item-icon" />
              <span>sequences</span>
            </div>
          </SidebarContextMenu>
          {sequencesExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schema.sequences.length === 0 ? (
                <div className="canvas-sidebar__empty">No sequences</div>
              ) : (
                schema.sequences.map((sequence) => (
                  <SidebarContextMenu
                    key={sequence.id}
                    actions={[
                      {
                        label: "Edit sequence",
                        icon: <Pen size={14} />,
                        onSelect: () => onEditSequence(schema.id, sequence.id),
                      },
                      {
                        label: "Delete sequence",
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onSelect: () =>
                          onDeleteSequence(schema.id, sequence.id),
                      },
                    ]}
                  >
                    <div className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf">
                      <Braces
                        size={14}
                        className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                      />
                      <span>{sequence.name}</span>
                    </div>
                  </SidebarContextMenu>
                ))
              )}
            </div>
          )}
          <SidebarContextMenu
            actions={[
              {
                label: "Add function",
                icon: <Plus size={14} />,
                onSelect: () => onAddFunction(schema.id),
              },
            ]}
          >
            <div
              className="canvas-sidebar__tree-item canvas-sidebar__tree-item--folder"
              onClick={() => setFunctionsExpanded((value) => !value)}
            >
              <ChevronDown
                size={13}
                className="canvas-sidebar__chevron"
                data-expanded={functionsExpanded}
              />
              <Cpu size={15} className="canvas-sidebar__item-icon" />
              <span>functions</span>
            </div>
          </SidebarContextMenu>
          {functionsExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schemaFunctions.length === 0 ? (
                <div className="canvas-sidebar__empty">No functions</div>
              ) : (
                schemaFunctions.map((fn) => (
                  <SidebarContextMenu
                    key={fn.id}
                    actions={[
                      {
                        label: "Edit function",
                        icon: <Pen size={14} />,
                        onSelect: () => onEditFunction(schema.id, fn.id),
                      },
                      {
                        label: "Delete function",
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onSelect: () => onDeleteFunction(schema.id, fn.id),
                      },
                    ]}
                  >
                    <div
                      className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf"
                      onClick={() => onEditFunction(schema.id, fn.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <Cpu
                        size={14}
                        className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                      />
                      <span>{fn.name}</span>
                    </div>
                  </SidebarContextMenu>
                ))
              )}
            </div>
          )}
          <div
            className="canvas-sidebar__tree-item canvas-sidebar__tree-item--folder"
            onClick={() => setTablesExpanded((value) => !value)}
          >
            <ChevronDown
              size={13}
              className="canvas-sidebar__chevron"
              data-expanded={tablesExpanded}
            />
            <Table2 size={15} className="canvas-sidebar__item-icon" />
            <span>tables</span>
          </div>
          {tablesExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schema.tables.length === 0 ? (
                <div className="canvas-sidebar__empty">No tables</div>
              ) : (
                schema.tables.map((table) => (
                  <SidebarContextMenu
                    key={table.id}
                    actions={[
                      {
                        label: "Find in diagram",
                        icon: <Search size={14} />,
                        onSelect: () =>
                          onSeeTableOnDiagram(schema.id, table.id),
                      },
                      {
                        label: "Delete table",
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onSelect: () => onDeleteTable(schema.id, table.id),
                      },
                    ]}
                  >
                    <div className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf">
                      <Table2
                        size={14}
                        className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                      />
                      <span>{table.name}</span>
                    </div>
                  </SidebarContextMenu>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
