import { FolderTree, Code2 } from "lucide-react";
import type { NodeProps } from "@xyflow/react";

export type DatabaseViewNodeData = {
  viewId: string;
  viewName: string;
  schemaName?: string;
  isMaterialized: boolean;
  definition: string;
  triggersCount?: number;
  triggerCount?: number;
};

export function DatabaseViewNode({ data }: NodeProps) {
  const viewData = data as DatabaseViewNodeData;
  const schemaName = viewData.schemaName || "unknown schema";
  const borderStyle = viewData.isMaterialized ? "dotted" : "dashed";
  const borderClass = viewData.isMaterialized ? "database-view-card--materialized" : "database-view-card--standard";
  const triggersCount = viewData.triggersCount ?? viewData.triggerCount ?? 0;

  return (
    <div
      className={`database-table-card database-view-card ${borderClass}`}
      style={{
        borderStyle: borderStyle,
        borderWidth: "2px",
        borderColor: "var(--color-purple, #a855f7)",
      }}
    >
      <div className="database-table-card__header" style={{ borderBottomColor: "rgba(168, 85, 247, 0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div className="database-table-card__schema" style={{
            background: "rgba(168, 85, 247, 0.08)",
            border: "1px solid rgba(168, 85, 247, 0.15)",
            color: "#c084fc",
          }}>
            <FolderTree size={11} style={{ marginRight: "4px", color: "#c084fc" }} />
            <span>{schemaName}</span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              background: viewData.isMaterialized ? "#c084fc" : "#e9d5ff",
              color: "#3b0764",
              padding: "1px 6px",
              borderRadius: "4px",
              letterSpacing: "0.5px",
            }}
          >
            {viewData.isMaterialized ? "MAT_VIEW" : "VIEW"}
          </span>
        </div>
        <div className="database-table-card__title-row" style={{ marginTop: "4px", minWidth: 0 }}>
          <span className="database-table-card__icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", flexShrink: 0 }}>🗔</span>
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }} title={viewData.viewName}>
            {viewData.viewName}
          </strong>
        </div>
      </div>

      <div className="database-table-card__columns" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", minWidth: 0 }}>
          <Code2 size={14} style={{ color: "#c084fc", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
            }}
            title={viewData.definition}
          >
            {viewData.definition.substring(0, 45)}...
          </span>
        </div>
        
        {triggersCount > 0 && (
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", gap: "4px", alignItems: "center" }}>
            <span>⚡</span>
            <span>{triggersCount} instead of trigger{triggersCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
