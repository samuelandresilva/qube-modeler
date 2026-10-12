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
  ScanEye,
  FileCode2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseSchema, DatabaseFunction, DatabaseView } from "@/core/model";
import { SidebarContextMenu } from "./SidebarContextMenu";

type Props = {
  schema: DatabaseSchema;
  projectFunctions: DatabaseFunction[];
  projectViews?: DatabaseView[];
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
};

export function SchemaTreeItem({
  schema,
  projectFunctions,
  projectViews,
  onEditSchema,
  onDeleteSchema,
  onAddSequence,
  onEditSequence,
  onDeleteSequence,
  onSeeTableOnDiagram,
  onDeleteTable,
  onViewTableSql,
  onAddFunction,
  onEditFunction,
  onDeleteFunction,
  onDeleteView,
}: Props) {
  const { t } = useTranslation("canvas");
  const [expanded, setExpanded] = useState(false);
  const [sequencesExpanded, setSequencesExpanded] = useState(false);
  const [functionsExpanded, setFunctionsExpanded] = useState(false);
  const [viewsExpanded, setViewsExpanded] = useState(false);
  const [tablesExpanded, setTablesExpanded] = useState(false);
  const schemaFunctions = (projectFunctions ?? []).filter(
    (fn) => fn.schemaId === schema.id
  );
  const schemaViews = (projectViews ?? []).filter(
    (view) => view.schemaId === schema.id
  );
  return (
    <div className="canvas-sidebar__schema">
      <SidebarContextMenu
        actions={[
          {
            label: t("sidebar.editSchema"),
            icon: <Pen size={14} />,
            onSelect: () => onEditSchema(schema.id),
          },
          {
            label: t("sidebar.deleteSchema"),
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
                label: t("sidebar.addSequence"),
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
              <span>{t("sidebar.sequences")}</span>
            </div>
          </SidebarContextMenu>
          {sequencesExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schema.sequences.length === 0 ? (
                <div className="canvas-sidebar__empty">{t("sidebar.noSequences")}</div>
              ) : (
                schema.sequences.map((sequence) => (
                  <SidebarContextMenu
                    key={sequence.id}
                    actions={[
                      {
                        label: t("sidebar.editSequence"),
                        icon: <Pen size={14} />,
                        onSelect: () => onEditSequence(schema.id, sequence.id),
                      },
                      {
                        label: t("sidebar.deleteSequence"),
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
                label: t("sidebar.addFunction"),
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
              <span>{t("sidebar.functions")}</span>
            </div>
          </SidebarContextMenu>
          {functionsExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schemaFunctions.length === 0 ? (
                <div className="canvas-sidebar__empty">{t("sidebar.noFunctions")}</div>
              ) : (
                schemaFunctions.map((fn) => (
                  <SidebarContextMenu
                    key={fn.id}
                    actions={[
                      {
                        label: t("sidebar.editFunction"),
                        icon: <Pen size={14} />,
                        onSelect: () => onEditFunction(schema.id, fn.id),
                      },
                      {
                        label: t("sidebar.deleteFunction"),
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
            onClick={() => setViewsExpanded((value) => !value)}
          >
            <ChevronDown
              size={13}
              className="canvas-sidebar__chevron"
              data-expanded={viewsExpanded}
            />
            <ScanEye size={15} className="canvas-sidebar__item-icon" />
            <span>{t("sidebar.views")}</span>
          </div>
          {viewsExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schemaViews.length === 0 ? (
                <div className="canvas-sidebar__empty">{t("sidebar.noViews")}</div>
              ) : (
                schemaViews.map((view) => (
                  <SidebarContextMenu
                    key={view.id}
                    actions={[
                      {
                        label: t("sidebar.findInDiagram"),
                        icon: <Search size={14} />,
                        onSelect: () =>
                          onSeeTableOnDiagram(schema.id, view.id),
                      },
                      ...(onDeleteView
                        ? [
                            {
                              label: t("sidebar.deleteView"),
                              icon: <Trash2 size={14} />,
                              danger: true,
                              onSelect: () => onDeleteView(schema.id, view.id),
                            },
                          ]
                        : []),
                    ]}
                  >
                    <div
                      className="canvas-sidebar__tree-item canvas-sidebar__tree-item--leaf"
                      onClick={() => onSeeTableOnDiagram(schema.id, view.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <ScanEye
                        size={14}
                        className="canvas-sidebar__item-icon canvas-sidebar__item-icon--muted"
                      />
                      <span>{view.name}</span>
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
            <span>{t("sidebar.tables")}</span>
          </div>
          {tablesExpanded && (
            <div className="canvas-sidebar__tree-group">
              {schema.tables.length === 0 ? (
                <div className="canvas-sidebar__empty">{t("sidebar.noTables")}</div>
              ) : (
                schema.tables.map((table) => (
                  <SidebarContextMenu
                    key={table.id}
                    actions={[
                      {
                        label: t("sidebar.findInDiagram"),
                        icon: <Search size={14} />,
                        onSelect: () =>
                          onSeeTableOnDiagram(schema.id, table.id),
                      },
                      ...(onViewTableSql
                        ? [
                            {
                              label: t("sidebar.viewSql"),
                              icon: <FileCode2 size={14} />,
                              onSelect: () => onViewTableSql(schema.id, table.id),
                            },
                          ]
                        : []),
                      {
                        label: t("sidebar.deleteTable"),
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
