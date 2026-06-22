import { CanvasModal } from "./CanvasModal";

type MessageDialogProps = {
  title: string;
  message: string;
  onClose: () => void;
};

export function MessageDialog({
  title,
  message,
  onClose,
}: MessageDialogProps) {
  return (
    <CanvasModal title={title} onClose={onClose} elevated>
      <div className="canvas-confirm">
        <p className="canvas-confirm__message">{message}</p>
        <div className="canvas-modal-actions">
          <button type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
