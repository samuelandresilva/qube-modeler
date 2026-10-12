import { useTranslation } from "react-i18next";
import { CanvasModal } from "./CanvasModal";

type ConfirmDialogProps = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");

  return (
    <CanvasModal title={t("dialogs.confirmTitle")} onClose={onCancel} elevated>
      <div className="canvas-confirm">
        <p className="canvas-confirm__message">{message}</p>
        <div className="canvas-modal-actions canvas-modal-actions--confirm">
          <button type="button" onClick={onCancel}>
            {t("actions.cancel")}
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel ?? t("actions.remove")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
