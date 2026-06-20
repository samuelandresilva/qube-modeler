import type { ReactNode } from "react";

type CanvasModalProps = {
    title: string;
    children: ReactNode;
    onClose: () => void;
};

export function CanvasModal({ title, children, onClose }: CanvasModalProps) {
    return (
        <div className="canvas-modal-backdrop">
            <div className="canvas-modal">
                <div className="canvas-modal__header">
                    <strong>{title}</strong>

                    <button type="button" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="canvas-modal__body">
                    {children}
                </div>
            </div>
        </div>
    );
}