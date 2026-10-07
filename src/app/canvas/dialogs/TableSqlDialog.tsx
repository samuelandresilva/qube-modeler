import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";
import { SqlEditor } from "@/app/shared/components/SqlEditor";

type Props = {
  tableName: string;
  schemaName: string;
  sql: string;
  onClose: () => void;
};

export function TableSqlDialog({
  tableName,
  schemaName,
  sql,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback in case clipboard API is unavailable
    }
  };

  return (
    <CanvasModal
      title={`SQL · ${schemaName}.${tableName}`}
      onClose={onClose}
      className="canvas-modal--large"
    >
      <div className="canvas-modal-form">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--color-text-muted)",
              }}
            >
              Generated Table DDL & Constraints
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: copied
                  ? "var(--color-success, #22c55e)"
                  : "var(--color-text)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy SQL"}</span>
            </button>
          </div>

          <SqlEditor value={sql} readOnly height="420px" />
        </div>

        <div className="canvas-modal-actions" style={{ marginTop: "16px" }}>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
