import { CanvasModal } from "./CanvasModal";

type ConfirmDialogProps = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  message,
  confirmLabel = "Remove",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <CanvasModal title="Confirm" onClose={onCancel} elevated>
      <div className="canvas-confirm">
        <p className="canvas-confirm__message">{message}</p>
        <div className="canvas-modal-actions canvas-modal-actions--confirm">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
