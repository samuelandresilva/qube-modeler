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
};

export function InspectorSection({
  title,
  addLabel,
  emptyLabel,
  items,
  onAdd,
  onEdit,
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
          items.map((item) => (
            <button
              className="canvas-inspector__column canvas-inspector__column--button"
              key={item.id}
              type="button"
              onClick={() => onEdit(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
