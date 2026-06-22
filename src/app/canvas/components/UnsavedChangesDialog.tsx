import { CanvasModal } from "./CanvasModal";

type UnsavedChangesDialogProps = {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesDialog({
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <CanvasModal title="Unsaved changes" onClose={onCancel} elevated>
      <div className="canvas-confirm">
        <p className="canvas-confirm__message">
          Do you want to save the changes to the current project before
          closing?
        </p>
        <div className="canvas-modal-actions canvas-modal-actions--unsaved">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="canvas-modal-actions__discard"
            type="button"
            onClick={onDiscard}
          >
            Don't save
          </button>
          <button type="button" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
