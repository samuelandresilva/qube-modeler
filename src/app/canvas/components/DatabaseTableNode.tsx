import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FolderTree } from "lucide-react";

export type DatabaseTableNodeData = {
  tableName: string;
  schemaName?: string;
  onDoubleClickColumn?: (columnId: string) => void;
  columns: {
    id: string;
    name: string;
    type: string;
    primaryKey?: boolean;
    nullable?: boolean;
  }[];
};

export function DatabaseTableNode({ data }: NodeProps) {
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
          <strong>{tableData.tableName}</strong>
        </div>
      </div>

      <div className="database-table-card__columns">
        {tableData.columns.map((column) => (
          <div
            className="database-table-card__column"
            key={column.id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              tableData.onDoubleClickColumn?.(column.id);
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

            <span className="database-table-card__column-name">
              {column.primaryKey ? "🔑 " : ""}
              {column.name}
            </span>

            <span className="database-table-card__column-type">
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
}
