import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, Position, type EdgeProps } from '@xyflow/react';

export function SmartRelationEdge({
  id,
  source,
  target,
  sourceY,
  targetY,
  style,
  markerEnd,
  label
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sourceX = sourceNode.internals.positionAbsolute.x;
  const targetX = targetNode.internals.positionAbsolute.x;
  const sourceWidth = sourceNode.measured?.width ?? 280;
  const targetWidth = targetNode.measured?.width ?? 280;

  const dx = targetX - sourceX;

  let sourceXPos: number;
  let targetXPos: number;
  let sourcePos: Position;
  let targetPos: Position;

  // Lógica de Roteamento Dinâmico
  if (dx > sourceWidth + 40) {
    // Target está claramente à direita
    sourcePos = Position.Right;
    targetPos = Position.Left;
    sourceXPos = sourceX + sourceWidth;
    targetXPos = targetX;
  } else if (dx < -(targetWidth + 40)) {
    // Target está claramente à esquerda
    sourcePos = Position.Left;
    targetPos = Position.Right;
    sourceXPos = sourceX;
    targetXPos = targetX + targetWidth;
  } else {
    // Tabelas empilhadas verticalmente (overlap horizontal)
    // Conecta Right -> Right formando um "C" (ou "]" ) na lateral
    sourcePos = Position.Right;
    targetPos = Position.Right;
    sourceXPos = sourceX + sourceWidth;
    targetXPos = targetX + targetWidth;
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sourceXPos,
    sourceY,
    sourcePosition: sourcePos,
    targetX: targetXPos,
    targetY,
    targetPosition: targetPos,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#020617',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 600,
              color: '#cbd5e1',
              pointerEvents: 'all', // Permite hover/click no label se necessário
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
export default SmartRelationEdge;
