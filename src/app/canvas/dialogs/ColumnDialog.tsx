import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseColumn, DatabaseColumnInput } from "@/core/model";
import {
  getBaseType,
  getDefaultScale,
  getDefaultSize,
  isArrayType,
  POSTGRES_COLUMN_TYPES,
  supportsScale,
  supportsSize,
} from "@/core/sql/postgres-column-types";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type ColumnDialogProps = {
  column?: DatabaseColumn;
  existingColumnNames: string[];
  availableSequenceNames: string[];
  onClose: () => void;
  onSubmit: (column: DatabaseColumnInput) => void;
  onDelete?: () => void;
};

export function ColumnDialog({
  column,
  existingColumnNames,
  availableSequenceNames,
  onClose,
  onSubmit,
  onDelete,
}: ColumnDialogProps) {
  const { t } = useTranslation("canvas");
  const [name, setName] = useState(column?.name ?? "");
  const [type, setType] = useState(column ? getBaseType(column.type) : "bigint");
  const [isArray, setIsArray] = useState(
    column?.isArray ?? (column ? isArrayType(column.type) : false),
  );
  const [size, setSize] = useState<number | undefined>(column?.size);
  const [scale, setScale] = useState<number | undefined>(column?.scale);
  const [nullable, setNullable] = useState(column?.nullable ?? true);
  const [primaryKey, setPrimaryKey] = useState(column?.primaryKey ?? false);
  const [defaultValue, setDefaultValue] = useState(column?.defaultValue ?? "");
  const [sequenceName, setSequenceName] = useState(column?.sequenceName ?? "");
  const [comment, setComment] = useState(column?.comment ?? "");
  const normalizedName = name.trim();
  const duplicate = existingColumnNames.some(
    (candidate) => candidate !== column?.name && candidate === normalizedName,
  );
  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);
  const sizeValid =
    !supportsSize(type) ||
    (Number.isInteger(size) && typeof size === "number" && size > 0);
  const scaleValid =
    !supportsScale(type) ||
    (Number.isInteger(scale) &&
      typeof scale === "number" &&
      scale >= 0 &&
      (typeof size !== "number" || scale <= size));
  const defaultValid = sequenceName !== "" || !/[;\n\r]/.test(defaultValue);
  const canSubmit =
    normalizedName !== "" &&
    valid &&
    !reserved &&
    !duplicate &&
    sizeValid &&
    scaleValid &&
    defaultValid;

  const submit = () =>
    onSubmit({
      name: normalizedName,
      type,
      isArray,
      size: supportsSize(type) ? size : undefined,
      scale: supportsScale(type) ? scale : undefined,
      nullable,
      primaryKey,
      defaultValue:
        sequenceName !== "" || defaultValue.trim() === ""
          ? undefined
          : defaultValue.trim(),
      sequenceName: sequenceName === "" ? undefined : sequenceName,
      comment: comment.trim() === "" ? undefined : comment.trim(),
    });

  return (
    <CanvasModal
      title={column ? t("dialogs.column.editTitle", { name: column.name }) : t("dialogs.column.addTitle")}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>{t("dialogs.column.name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("dialogs.column.namePlaceholder")}
          />
        </label>
        <div
          className="canvas-modal-form__row"
          style={{ gridTemplateColumns: "1fr auto", alignItems: "flex-end" }}
        >
          <label>
            <span>{t("dialogs.column.type")}</span>
            <select
              value={type}
              onChange={(event) => {
                const next = event.target.value;
                setType(next);
                setSize(getDefaultSize(next));
                setScale(getDefaultScale(next));
              }}
            >
              {POSTGRES_COLUMN_TYPES.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="canvas-modal-checkbox" style={{ minWidth: "90px" }}>
            <span>{t("dialogs.column.array")}</span>
            <input
              type="checkbox"
              checked={isArray}
              onChange={(event) => setIsArray(event.target.checked)}
            />
          </label>
        </div>
        <div className="canvas-modal-form__row">
          <label>
            <span>{t("dialogs.column.size")}</span>
            <input
              type="number"
              min="1"
              value={size ?? ""}
              disabled={!supportsSize(type)}
              onChange={(event) =>
                setSize(
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>{t("dialogs.column.scale")}</span>
            <input
              type="number"
              min="0"
              value={scale ?? ""}
              disabled={!supportsScale(type)}
              onChange={(event) =>
                setScale(
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
                )
              }
            />
          </label>
        </div>
        <div className="canvas-modal-form__row">
          <label className="canvas-modal-checkbox">
            <span>{t("dialogs.column.nullable")}</span>
            <input
              type="checkbox"
              checked={nullable}
              onChange={(event) => setNullable(event.target.checked)}
            />
          </label>
          <label className="canvas-modal-checkbox">
            <span>{t("dialogs.column.primaryKey")}</span>
            <input
              type="checkbox"
              checked={primaryKey}
              onChange={(event) => setPrimaryKey(event.target.checked)}
            />
          </label>
        </div>
        <label>
          <span>{t("dialogs.column.sequence")}</span>
          <select
            value={sequenceName}
            onChange={(event) => {
              setSequenceName(event.target.value);
              if (event.target.value) setDefaultValue("");
            }}
          >
            <option value="">{t("dialogs.column.noSequence")}</option>
            {availableSequenceNames.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("dialogs.column.defaultValue")}</span>
          <input
            value={defaultValue}
            disabled={sequenceName !== ""}
            onChange={(event) => setDefaultValue(event.target.value)}
            placeholder={t("dialogs.column.defaultValuePlaceholder")}
          />
        </label>
        <label>
          <span>{t("dialogs.column.comment")}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("dialogs.column.commentPlaceholder")}
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.duplicate")}
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.valid")}
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.reserved")}
          </p>
        )}
        {!sizeValid && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.size")}
          </p>
        )}
        {!scaleValid && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.scale")}
          </p>
        )}
        {!defaultValid && (
          <p className="canvas-modal-error">
            {t("dialogs.column.errors.default")}
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              {t("dialogs.column.delete")}
            </button>
          )}
          <button type="button" onClick={onClose}>
            {t("dialogs.column.cancel")}
          </button>
          <button type="button" disabled={!canSubmit} onClick={submit}>
            {column ? t("dialogs.column.save") : t("dialogs.column.create")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
