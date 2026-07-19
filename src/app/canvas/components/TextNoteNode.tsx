import { useState, useRef, useEffect, memo } from "react";
import { NodeResizer } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export type TextNoteNodeData = {
  id: string;
  content: string;
  color: string;
  width: number;
  height: number;
  onChangeContent?: (id: string, content: string) => void;
  onChangeDimensions?: (id: string, width: number, height: number) => void;
};

export const TextNoteNode = memo(function TextNoteNode({ id, data, selected }: NodeProps) {
  const noteData = data as unknown as TextNoteNodeData;
  const color = noteData.color || "#eab308";

  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  const handleFinishEditing = () => {
    setIsEditing(false);
    if (tempContent.trim() !== noteData.content.trim()) {
      noteData.onChangeContent?.(id, tempContent);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `${color}20`,
        border: `2px solid ${color}`,
        borderRadius: "8px",
        padding: "16px",
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "stretch",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        cursor: isEditing ? "text" : "move",
        pointerEvents: "auto",
      }}
      onDoubleClick={() => {
        setIsEditing(true);
        setTempContent(noteData.content);
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={100}
        lineStyle={{ borderColor: color }}
        handleStyle={{ background: color, borderRadius: "50%" }}
        onResizeEnd={(_event, params) => {
          noteData.onChangeDimensions?.(id, params.width, params.height);
        }}
      />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={tempContent}
          onChange={(e) => setTempContent(e.target.value)}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setTempContent(noteData.content);
              setIsEditing(false);
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            border: 0,
            outline: "none",
            resize: "none",
            color: "var(--color-text)",
            fontFamily: "inherit",
            fontSize: "13px",
            lineHeight: "1.4",
            padding: 0,
            margin: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            color: "var(--color-text-strong)",
            fontSize: "13px",
            lineHeight: "1.4",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {noteData.content || (
            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
              Double-click to edit...
            </span>
          )}
        </div>
      )}
    </div>
  );
});
