import { useState, useRef, useCallback, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, Position, useReactFlow, useStore, type EdgeProps } from '@xyflow/react';

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
  const { updateEdge, getEdge } = useReactFlow();
  void useStore;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const initialOffset = useRef(0);

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const edgeData = getEdge(id)?.data || {};
  const customOffset = (edgeData.customOffset as number) || 40;

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGPathElement>) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    initialOffset.current = customOffset;
    setIsDragging(true);
  }, [customOffset]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const novoValor = initialOffset.current + deltaX;
      // Impede que o recuo fique menor que 10 pixels
      const safeValue = Math.max(10, novoValor);
      const currentEdgeData = getEdge(id)?.data || {};
      updateEdge(id, { data: { ...currentEdgeData, customOffset: safeValue } });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, id, getEdge, updateEdge]);

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
  if (dx > sourceWidth + customOffset) {
    // Target está claramente à direita
    sourcePos = Position.Right;
    targetPos = Position.Left;
    sourceXPos = sourceX + sourceWidth;
    targetXPos = targetX;
  } else if (dx < -(targetWidth + customOffset)) {
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
    sourceXPos = sourceX + sourceWidth + customOffset;
    targetXPos = targetX + targetWidth + customOffset;
  }

  const [initialEdgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sourceXPos,
    sourceY,
    sourcePosition: sourcePos,
    targetX: targetXPos,
    targetY,
    targetPosition: targetPos,
    borderRadius: 16,
  });

  let edgePath = initialEdgePath;

  // Se for o caso do "C" (ambos Position.Right), estender o caminho até os handles das tabelas para não flutuar
  if (sourcePos === Position.Right && targetPos === Position.Right) {
    const startSegment = `M ${sourceX + sourceWidth} ${sourceY} L ${sourceXPos} ${sourceY}`;
    const endSegment = `L ${targetX + targetWidth} ${targetY}`;
    edgePath = `${startSegment} ${edgePath.replace(/^M/, 'L')} ${endSegment}`;
  }

  return (
    <>
      {/* Linha Visível Original */}
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Hitbox Transparente e Arrastável */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20} // Hitbox de 20px para facilitar o clique
        className="react-flow__edge-interaction"
        onPointerDown={handlePointerDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'all'
        }}
      />

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
