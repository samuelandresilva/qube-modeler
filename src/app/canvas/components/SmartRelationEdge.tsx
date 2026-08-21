import { useState, useRef, useCallback, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useInternalNode,
  Position,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

export function SmartRelationEdge({
  id,
  source,
  target,
  sourceY,
  targetY,
  selected,
  label,
  data,
}: EdgeProps) {
  const { updateEdge, getEdge } = useReactFlow();

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const initialOffset = useRef(0);

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const edgeData = (getEdge(id)?.data ?? data ?? {}) as Record<string, unknown>;
  const edgeIndex = (edgeData.edgeIndex as number) || 0;
  const customOffset = (edgeData.customOffset as number) || 0;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGPathElement>) => {
      e.preventDefault();
      dragStartX.current = e.clientX;
      initialOffset.current = customOffset;
      setIsDragging(true);
    },
    [customOffset],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const novoValor = initialOffset.current + deltaX;
      const currentEdgeData = getEdge(id)?.data || {};
      updateEdge(id, { data: { ...currentEdgeData, customOffset: novoValor } });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, id, getEdge, updateEdge]);

  if (!sourceNode || !targetNode) return null;

  const sourceX = sourceNode.internals.positionAbsolute.x;
  const sourceY_node = sourceNode.internals.positionAbsolute.y;
  const targetX = targetNode.internals.positionAbsolute.x;
  const targetY_node = targetNode.internals.positionAbsolute.y;

  const sourceWidth = sourceNode.measured?.width ?? 320;
  const targetWidth = targetNode.measured?.width ?? 320;

  const actualSourceY = sourceY || sourceY_node + 40;
  const actualTargetY = targetY || targetY_node + 40;

  const sourceLeft = sourceX;
  const sourceRight = sourceX + sourceWidth;
  const targetLeft = targetX;
  const targetRight = targetX + targetWidth;

  const stagger = edgeIndex * 14;

  let sx: number;
  let tx: number;
  let sourcePos: Position;
  let targetPos: Position;
  let offset: number;

  // Lógica de Roteamento Dinâmico Inteligente
  if (targetLeft >= sourceRight - 40) {
    // 1. Target está à DIREITA da origem -> Conecta Direita -> Esquerda
    sourcePos = Position.Right;
    targetPos = Position.Left;
    sx = sourceRight;
    tx = targetLeft;
    offset = Math.max(16, 24 + stagger + customOffset);
  } else if (targetRight <= sourceLeft + 40) {
    // 2. Target está à ESQUERDA da origem -> Conecta Esquerda -> Direita
    sourcePos = Position.Left;
    targetPos = Position.Right;
    sx = sourceLeft;
    tx = targetRight;
    offset = Math.max(16, 24 + stagger + customOffset);
  } else {
    // 3. Tabelas alinhadas verticalmente (overlap horizontal)
    // Conecta Right -> Right formando contorno lateral suave sem passar por dentro das tabelas
    sourcePos = Position.Right;
    targetPos = Position.Right;
    sx = sourceRight;
    tx = targetRight;
    const lateralDelta = Math.max(0, targetRight - sourceRight);
    offset = Math.max(30, 36 + lateralDelta + stagger + customOffset);
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sx,
    sourceY: actualSourceY,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: actualTargetY,
    targetPosition: targetPos,
    borderRadius: 12,
    offset,
  });

  const isActive = selected || isHovered;
  const strokeColor = isActive ? "#38bdf8" : "rgba(56, 189, 248, 0.45)";
  const strokeWidth = isActive ? (selected ? 2.5 : 2.2) : 1.6;

  const sourceTable = (edgeData.sourceTable as string) || "";
  const targetTable = (edgeData.targetTable as string) || "";
  const sourceColumns =
    (edgeData.sourceColumns as string[]) ||
    ((edgeData.sourceColumn as string) ? [edgeData.sourceColumn as string] : []);
  const targetColumns =
    (edgeData.targetColumns as string[]) ||
    ((edgeData.targetColumn as string) ? [edgeData.targetColumn as string] : []);

  const sourceColStr =
    (edgeData.sourceColStr as string) ||
    (sourceColumns.length > 1
      ? `(${sourceColumns.join(", ")})`
      : sourceColumns[0] || "");
  const targetColStr =
    (edgeData.targetColStr as string) ||
    (targetColumns.length > 1
      ? `(${targetColumns.join(", ")})`
      : targetColumns[0] || "");

  const detailedLabel =
    sourceTable && targetTable
      ? `${sourceTable}.${sourceColStr} → ${targetTable}.${targetColStr}`
      : (label as string) || `${sourceColStr} → ${targetColStr}`;

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id={`fk-arrow-default-${id}`}
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 8 3.5, 0 7" fill="rgba(56, 189, 248, 0.6)" />
          </marker>
          <marker
            id={`fk-arrow-active-${id}`}
            markerWidth="12"
            markerHeight="12"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 9 3.5, 0 7" fill="#38bdf8" />
          </marker>
        </defs>
      </svg>

      {/* Linha de Relacionamento Visível */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          filter: isActive ? "drop-shadow(0 0 5px rgba(56, 189, 248, 0.8))" : undefined,
          transition: "stroke 150ms ease, stroke-width 150ms ease",
          zIndex: isActive ? 100 : 1,
        }}
        markerEnd={`url(#${isActive ? `fk-arrow-active-${id}` : `fk-arrow-default-${id}`})`}
      />

      {/* Hitbox Transparente e Interativa para Clique, Arraste e Hover */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={22}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handlePointerDown}
        style={{
          cursor: isDragging ? "grabbing" : "pointer",
          pointerEvents: "all",
        }}
      />

      {/* Rótulo / Badge Informativo da FK exibido apenas em hover ou seleção */}
      {isActive && detailedLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid #38bdf8",
              boxShadow: "0 0 12px rgba(56, 189, 248, 0.4), 0 4px 14px rgba(0,0,0,0.6)",
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace",
              color: "#38bdf8",
              pointerEvents: "all",
              transition: "all 150ms ease",
              userSelect: "none",
              zIndex: 1001,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="nodrag nopan"
            title={`Foreign Key: ${detailedLabel}`}
          >
            {detailedLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default SmartRelationEdge;
