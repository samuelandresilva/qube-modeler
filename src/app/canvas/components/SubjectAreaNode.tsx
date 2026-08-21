import { memo } from "react";
import { NodeResizer } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export type SubjectAreaNodeData = {
  id: string;
  label: string;
  color: string;
  width: number;
  height: number;
  onChangeDimensions?: (id: string, width: number, height: number) => void;
};

export const SubjectAreaNode = memo(function SubjectAreaNode({ id, data, selected }: NodeProps) {
  const areaData = data as unknown as SubjectAreaNodeData;
  const color = areaData.color || "#3b82f6";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `${color}15`,
        border: `2px dashed ${color}`,
        borderRadius: "8px",
        padding: "12px",
        boxSizing: "border-box",
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <NodeResizer
          isVisible={selected}
          minWidth={200}
          minHeight={200}
          lineStyle={{ borderColor: color }}
          handleStyle={{ background: color, borderRadius: "50%" }}
          onResizeEnd={(_event, params) => {
            areaData.onChangeDimensions?.(id, params.width, params.height);
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "12px",
          color: color,
          fontWeight: "bold",
          fontSize: "14px",
          userSelect: "none",
          pointerEvents: "auto",
        }}
      >
        {areaData.label}
      </div>
    </div>
  );
});
