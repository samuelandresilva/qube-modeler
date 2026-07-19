import { Plus } from "lucide-react";
import type { ReactNode } from "react";

type Item = { id: string; label: ReactNode; detail: ReactNode };
type Props = {
  title: string;
  addLabel: string;
  emptyLabel?: string;
  items: Item[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
};

export function InspectorSection({
  title,
  addLabel,
  emptyLabel,
  items,
  onAdd,
  onEdit,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <section className="canvas-inspector__section">
      <div className="canvas-inspector__section-header">
        <span className="canvas-inspector__section-title">{title}</span>
        <button
          className="canvas-inspector__section-icon-button"
          type="button"
          title={addLabel}
          aria-label={addLabel}
          onClick={onAdd}
        >
          <Plus size={15} strokeWidth={2.6} />
        </button>
      </div>
      <div className="canvas-inspector__columns">
        {items.length === 0 && emptyLabel ? (
          <p className="canvas-inspector__empty">{emptyLabel}</p>
        ) : (
          items.map((item, index) => {
            const titleText =
              typeof item.label === "string" && typeof item.detail === "string"
                ? `${item.label} (${item.detail})`
                : typeof item.label === "string"
                ? item.label
                : undefined;
            return (
              <div key={item.id} className="canvas-inspector__column-row" style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                <button
                  className="canvas-inspector__column canvas-inspector__column--button"
                  type="button"
                  onClick={() => onEdit(item.id)}
                  title={titleText}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </button>
                {onMoveUp && onMoveDown && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onMoveUp(item.id)}
                      disabled={index === 0}
                      style={{
                        border: 0,
                        background: "var(--color-bg)",
                        color: "var(--color-text-muted)",
                        width: "20px",
                        height: "18px",
                        borderRadius: "3px",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                        opacity: index === 0 ? 0.3 : 1,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "9px"
                      }}
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown(item.id)}
                      disabled={index === items.length - 1}
                      style={{
                        border: 0,
                        background: "var(--color-bg)",
                        color: "var(--color-text-muted)",
                        width: "20px",
                        height: "18px",
                        borderRadius: "3px",
                        cursor: index === items.length - 1 ? "not-allowed" : "pointer",
                        opacity: index === items.length - 1 ? 0.3 : 1,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "9px"
                      }}
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
