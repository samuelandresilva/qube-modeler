import { useState } from "react";
import type { DatabaseColumn, DatabaseColumnInput } from "@/core/model";
import {
  getDefaultScale,
  getDefaultSize,
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
  const [name, setName] = useState(column?.name ?? "");
  const [type, setType] = useState(column?.type ?? "bigint");
  const [size, setSize] = useState<number | undefined>(column?.size);
  const [scale, setScale] = useState<number | undefined>(column?.scale);
  const [nullable, setNullable] = useState(column?.nullable ?? true);
  const [primaryKey, setPrimaryKey] = useState(column?.primaryKey ?? false);
  const [defaultValue, setDefaultValue] = useState(column?.defaultValue ?? "");
  const [sequenceName, setSequenceName] = useState(column?.sequenceName ?? "");
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
      size,
      scale,
      nullable,
      primaryKey,
      defaultValue:
        sequenceName !== "" || defaultValue.trim() === ""
          ? undefined
          : defaultValue.trim(),
      sequenceName: sequenceName === "" ? undefined : sequenceName,
    });

  return (
    <CanvasModal
      title={column ? `Edit column · ${column.name}` : "Add column"}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="column_name"
          />
        </label>
        <label>
          <span>Type</span>
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
        <div className="canvas-modal-form__row">
          <label>
            <span>Size</span>
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
            <span>Scale</span>
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
            <span>Nullable</span>
            <input
              type="checkbox"
              checked={nullable}
              onChange={(event) => setNullable(event.target.checked)}
            />
          </label>
          <label className="canvas-modal-checkbox">
            <span>Primary key</span>
            <input
              type="checkbox"
              checked={primaryKey}
              onChange={(event) => setPrimaryKey(event.target.checked)}
            />
          </label>
        </div>
        <label>
          <span>Sequence</span>
          <select
            value={sequenceName}
            onChange={(event) => {
              setSequenceName(event.target.value);
              if (event.target.value) setDefaultValue("");
            }}
          >
            <option value="">No sequence</option>
            {availableSequenceNames.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Default value</span>
          <input
            value={defaultValue}
            disabled={sequenceName !== ""}
            onChange={(event) => setDefaultValue(event.target.value)}
            placeholder="CURRENT_TIMESTAMP, true, 0..."
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            A column with this name already exists.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Column name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Column name cannot be a PostgreSQL reserved word.
          </p>
        )}
        {!sizeValid && (
          <p className="canvas-modal-error">
            Size must be a positive integer for this type.
          </p>
        )}
        {!scaleValid && (
          <p className="canvas-modal-error">
            Scale must be zero or a positive integer and cannot be greater than size.
          </p>
        )}
        {!defaultValid && (
          <p className="canvas-modal-error">
            Default value cannot contain semicolon or line breaks.
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              Delete column
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!canSubmit} onClick={submit}>
            {column ? "Save column" : "Create column"}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
