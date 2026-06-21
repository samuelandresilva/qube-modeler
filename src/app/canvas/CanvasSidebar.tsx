import { useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  Braces,
  ChevronDown,
  Database,
  Eye,
  FolderTree,
  Pen,
  Plus,
  Rows3,
  Search,
  Table2,
  Trash2,
} from "lucide-react";

import type { DatabaseProject } from "../../core/model";

type CanvasSidebarProps = {
  project: DatabaseProject;
  onRenameProject: (name: string) => void;
  onAddSchema: () => void;
  onEditSchema?: (schemaId: string) => void;
  onDeleteSchema?: (schemaId: string) => void;
  onAddSequence: (schemaId: string) => void;
  onEditSequence: (schemaId: string, sequenceId: string) => void;
  onDeleteSequence: (schemaId: string, sequenceId: string) => void;
  onSeeTableOnDiagram: (schemaId: string, tableId: string) => void;
};

export function CanvasSidebar({
  project,
  onRenameProject,
  onAddSchema,
  onEditSchema,
  onDeleteSchema,
  onAddSequence,
  onEditSequence,
  onDeleteSequence,
  onSeeTableOnDiagram,
}: CanvasSidebarProps) {
  const [schemasExpanded, setSchemasExpanded] = useState(true);
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [expandedSequences, setExpandedSequences] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const isSchemaExpanded = (schemaId: string) =>
    expandedSchemas[schemaId] ?? true;

  const isSequencesExpanded = (schemaId: string) =>
    expandedSequences[schemaId] ?? true;

  const isTablesExpanded = (schemaId: string) =>
    expandedTables[schemaId] ?? true;

  const toggleSchema = (schemaId: string) => {
    setExpandedSchemas((current) => ({
      ...current,
      [schemaId]: !(current[schemaId] ?? true),
    }));
  };

  const toggleSequences = (schemaId: string) => {
    setExpandedSequences((current) => ({
      ...current,
      [schemaId]: !(current[schemaId] ?? true),
    }));
  };

  const toggleTables = (schemaId: string) => {
    setExpandedTables((current) => ({
      ...current,
      [schemaId]: !(current[schemaId] ?? true),
    }));
  };

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
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>
            <div
              className="canvas-sidebar__tree-item canvas-sidebar__tree-item--schema-root"
              onClick={() => setSchemasExpanded((current) => !current)}
            >
              <ChevronDown
                size={13}
                className="canvas-sidebar__chevron"
                data-expanded={schemasExpanded}
              />
              <FolderTree
                size={15}
                className="canvas-sidebar__item-icon"
              />
              <span>schemas</span>
            </div>
          </ContextMenu.Trigger>

          <ContextMenu.Portal>
            <ContextMenu.Content className="canvas-context-menu">
              <ContextMenu.Item
                className="canvas-context-menu__item"
                onSelect={onAddSchema}
              >
                <Plus size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                Add schema
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>

        {schemasExpanded && (
          <div className="canvas-sidebar__tree-group">
            {project.schemas.map((schema) => (
              <div className="canvas-sidebar__schema" key={schema.id}>
                <ContextMenu.Root>
                  <ContextMenu.Trigger asChild>
                    <div
                      className="canvas-sidebar__tree-item canvas-sidebar__tree-item--schema"
                      onClick={() => toggleSchema(schema.id)}
                    >
                      <ChevronDown
                        size={13}
                        className="canvas-sidebar__chevron"
                        data-expanded={isSchemaExpanded(schema.id)}
                      />
                      <Database
                        size={15}
                        className="canvas-sidebar__item-icon"
                      />
                      <span>{schema.name}</span>
                    </div>
                  </ContextMenu.Trigger>

                  <ContextMenu.Portal>
                    <ContextMenu.Content className="canvas-context-menu">
                      <ContextMenu.Item
                        className="canvas-context-menu__item"
                        onSelect={() => onEditSchema?.(schema.id)}
                      >
                        <Pen size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                        Edit schema
                      </ContextMenu.Item>

                      <ContextMenu.Item
                        className="canvas-context-menu__item canvas-context-menu__item--danger"
                        onSelect={() => onDeleteSchema?.(schema.id)}
                      >
                        <Trash2 size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                        Delete schema
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>

                {isSchemaExpanded(schema.id) && (
                  <div className="canvas-sidebar__tree-group">
                    <ContextMenu.Root>
                      <ContextMenu.Trigger asChild>
                        <div
                          className="canvas-sidebar__tree-item canvas-sidebar__tree-item--folder"
                          onClick={() => toggleSequences(schema.id)}
                        >
                          <ChevronDown
                            size={13}
                            className="canvas-sidebar__chevron"
                            data-expanded={isSequencesExpanded(schema.id)}
                          />
                          <Rows3
                            size={15}
                            className="canvas-sidebar__item-icon"
                          />
                          <span>sequences</span>
                        </div>
                      </ContextMenu.Trigger>

                      <ContextMenu.Portal>
                        <ContextMenu.Content className="canvas-context-menu">
                          <ContextMenu.Item
                            className="canvas-context-menu__item"
                            onSelect={() => onAddSequence(schema.id)}
                          >
                            <Plus size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                            Add sequence
                          </ContextMenu.Item>
                        </ContextMenu.Content>
                      </ContextMenu.Portal>
                    </ContextMenu.Root>

                    {isSequencesExpanded(schema.id) && (
                      <div className="canvas-sidebar__tree-group">
                        {schema.sequences.length === 0 ? (
                          <div className="canvas-sidebar__empty">
                            No sequences
                          </div>
                        ) : (
                          schema.sequences.map((sequence) => (
                            <ContextMenu.Root key={sequence.id}>
                              <ContextMenu.Trigger asChild>
                                <div className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf">
                                  <Braces
                                    size={14}
                                    className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                                  />
                                  <span>{sequence.name}</span>
                                </div>
                              </ContextMenu.Trigger>

                              <ContextMenu.Portal>
                                <ContextMenu.Content className="canvas-context-menu">
                                  <ContextMenu.Item
                                    className="canvas-context-menu__item"
                                    onSelect={() =>
                                      onEditSequence(schema.id, sequence.id)
                                    }
                                  >
                                    <Pen size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                                    Edit sequence
                                  </ContextMenu.Item>

                                  <ContextMenu.Item
                                    className="canvas-context-menu__item canvas-context-menu__item--danger"
                                    onSelect={() =>
                                      onDeleteSequence(schema.id, sequence.id)
                                    }
                                  >
                                    <Trash2 size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                                    Delete sequence
                                  </ContextMenu.Item>
                                </ContextMenu.Content>
                              </ContextMenu.Portal>
                            </ContextMenu.Root>
                          ))
                        )}
                      </div>
                    )}

                    <div
                      className="canvas-sidebar__tree-item canvas-sidebar__tree-item--folder"
                      onClick={() => toggleTables(schema.id)}
                    >
                      <ChevronDown
                        size={13}
                        className="canvas-sidebar__chevron"
                        data-expanded={isTablesExpanded(schema.id)}
                      />
                      <Table2
                        size={15}
                        className="canvas-sidebar__item-icon"
                      />
                      <span>tables</span>
                    </div>

                    {isTablesExpanded(schema.id) && (
                      <div className="canvas-sidebar__tree-group">
                        {schema.tables.length === 0 ? (
                          <div className="canvas-sidebar__empty">
                            No tables
                          </div>
                        ) : (
                          schema.tables.map((table) => (
                            <ContextMenu.Root key={table.id}>
                              <ContextMenu.Trigger asChild>
                                <div className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf">
                                  <Table2
                                    size={14}
                                    className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                                  />
                                  <span>{table.name}</span>
                                </div>
                              </ContextMenu.Trigger>

                              <ContextMenu.Portal>
                                <ContextMenu.Content className="canvas-context-menu">
                                  <ContextMenu.Item
                                    className="canvas-context-menu__item"
                                    onSelect={() =>
                                      onSeeTableOnDiagram(schema.id, table.id)
                                    }
                                  >
                                    <Search size={14} className="canvas-context-menu__item-icon" style={{ marginRight: '8px' }} />
                                    Find in diagram
                                  </ContextMenu.Item>
                                </ContextMenu.Content>
                              </ContextMenu.Portal>
                            </ContextMenu.Root>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}