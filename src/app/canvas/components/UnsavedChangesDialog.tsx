import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");

  return (
    <CanvasModal title={t("dialogs.unsavedChangesTitle")} onClose={onCancel} elevated>
      <div className="canvas-confirm">
        <p className="canvas-confirm__message">
          {t("dialogs.unsavedChangesMessage")}
        </p>
        <div className="canvas-modal-actions canvas-modal-actions--unsaved">
          <button type="button" onClick={onCancel}>
            {t("actions.cancel")}
          </button>
          <button
            className="canvas-modal-actions__discard"
            type="button"
            onClick={onDiscard}
          >
            {t("dialogs.discardChanges")}
          </button>
          <button type="button" onClick={onSave}>
            {t("actions.save")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
