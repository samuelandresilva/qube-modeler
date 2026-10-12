import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  initialName?: string;
  initialComment?: string;
  existingNames: string[];
  onClose: () => void;
  onSubmit: (name: string, comment: string) => void;
};

export function SchemaDialog({
  initialName,
  initialComment,
  existingNames,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation("canvas");
  const [name, setName] = useState(initialName ?? "");
  const [comment, setComment] = useState(initialComment ?? "");
  const normalized = name.trim();
  const duplicate = existingNames.some(
    (item) => item !== initialName && item === normalized,
  );
  const valid = normalized === "" || isValidSqlIdentifier(normalized);
  const reserved = normalized !== "" && isPostgresReservedWord(normalized);
  const canSubmit = normalized !== "" && valid && !reserved && !duplicate;
  return (
    <CanvasModal
      title={initialName ? t("dialogs.schema.editTitle", { name: initialName }) : t("dialogs.schema.addTitle")}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>{t("dialogs.schema.name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("dialogs.schema.namePlaceholder")}
          />
        </label>
        <label>
          <span>{t("dialogs.schema.comment")}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("dialogs.schema.commentPlaceholder")}
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            {t("dialogs.schema.errors.duplicate")}
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            {t("dialogs.schema.errors.valid")}
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            {t("dialogs.schema.errors.reserved")}
          </p>
        )}
        <div className="canvas-modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(normalized, comment.trim())}
          >
            {t("dialogs.schema.save")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
