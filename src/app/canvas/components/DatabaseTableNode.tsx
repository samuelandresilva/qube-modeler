import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FolderTree } from "lucide-react";

export type DatabaseTableNodeData = {
  tableName: string;
  schemaName?: string;
  onDoubleClickColumn?: (tableId: string, columnId: string) => void;
  columns: {
    id: string;
    name: string;
    type: string;
    primaryKey?: boolean;
    nullable?: boolean;
  }[];
};

export const DatabaseTableNode = memo(function DatabaseTableNode({ id, data }: NodeProps) {
  const tableData = data as DatabaseTableNodeData;
  const schemaName = tableData.schemaName || "unknown schema";

  return (
    <div className="database-table-card">
      <div className="database-table-card__header">
        <div className="database-table-card__schema">
          <FolderTree className="database-table-card__schema-icon" size={11} />
          <span className="database-table-card__schema-name">{schemaName}</span>
        </div>
        <div className="database-table-card__title-row">
          <span className="database-table-card__icon">▦</span>
          <strong title={tableData.tableName}>{tableData.tableName}</strong>
        </div>
      </div>

      <div className="database-table-card__columns">
        {tableData.columns.map((column) => (
          <div
            className="database-table-card__column"
            key={column.id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              tableData.onDoubleClickColumn?.(id, column.id);
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${column.name}-target-left`}
              className="database-table-card__column-handle database-table-card__column-handle--left"
            />

            <Handle
              type="source"
              position={Position.Left}
              id={`${column.name}-source-left`}
              className="database-table-card__column-handle database-table-card__column-handle--left"
            />

            <span className="database-table-card__column-name" title={column.name}>
               {column.primaryKey ? "🔑 " : "🔹 "}
              {column.name}
            </span>

            <span
              className="database-table-card__column-type"
              title={`${column.type}${!column.nullable ? " not null" : ""}`}
            >
              {column.type}
              {!column.nullable ? " not null" : ""}
            </span>

            <Handle
              type="target"
              position={Position.Right}
              id={`${column.name}-target-right`}
              className="database-table-card__column-handle database-table-card__column-handle--right"
            />

            <Handle
              type="source"
              position={Position.Right}
              id={`${column.name}-source-right`}
              className="database-table-card__column-handle database-table-card__column-handle--right"
            />
          </div>
        ))}
      </div>
    </div>
  );
});
