import type { ReactNode } from "react";

type CanvasModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  elevated?: boolean;
  className?: string;
};

export function CanvasModal({
  title,
  children,
  onClose,
  elevated = false,
  className = "",
}: CanvasModalProps) {
  return (
    <div
      className={`canvas-modal-backdrop${elevated ? " canvas-modal-backdrop--elevated" : ""}`}
    >
      <div className={`canvas-modal ${className}`}>
        <div className="canvas-modal__header">
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="canvas-modal__body">{children}</div>
      </div>
    </div>
  );
}
