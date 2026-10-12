import { useTranslation } from "react-i18next";
import { useState } from "react";
import { MultiColumnSelect } from "@/app/shared/components/MultiColumnSelect";
import type { DatabaseTable, IndexMethod } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Entity = "index" | "unique constraint";
type Props = {
  entity: Entity;
  table: DatabaseTable;
  current?: {
    name: string;
    columns: string[];
    method?: IndexMethod;
    condition?: string;
    comment?: string;
  };
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    columns: string[];
    method?: IndexMethod;
    condition?: string;
    comment?: string;
  }) => void;
  onDelete?: () => void;
};

export function NamedColumnsDialog({
  entity,
  table,
  current,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const { t } = useTranslation("canvas");
  const collection =
    entity === "index" ? table.indexes : table.uniqueConstraints;
  const prefix = entity === "index" ? "idx" : "uk";
  const [name, setName] = useState(current?.name ?? `${prefix}_${table.name}_`);
  const [columns, setColumns] = useState(current?.columns ?? []);
  const [method, setMethod] = useState<IndexMethod>(current?.method ?? "btree");
  const [condition, setCondition] = useState(current?.condition ?? "");
  const [comment, setComment] = useState(current?.comment ?? "");
  const normalizedName = name.trim();
  const duplicate = collection.some(
    (item) => item.name !== current?.name && item.name === normalizedName,
  );
  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);
  const canSubmit =
    normalizedName !== "" &&
    valid &&
    !reserved &&
    !duplicate &&
    columns.length > 0;
  const label = entity === "index" ? t("dialogs.namedColumns.entityIndex") : t("dialogs.namedColumns.entityUniqueConstraint");

  return (
    <CanvasModal
      title={current ? t("dialogs.namedColumns.editTitle", { label, name: current.name }) : t("dialogs.namedColumns.addTitle", { label })}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>{t("dialogs.namedColumns.name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${prefix}_table_column`}
          />
        </label>
        <label>
          <span>{t("dialogs.namedColumns.columns")}</span>
          <MultiColumnSelect
            availableColumns={table.columns.map((column) => column.name)}
            selectedColumns={columns}
            onChange={setColumns}
          />
        </label>
        {entity === "index" && (
          <label>
            <span>{t("dialogs.namedColumns.accessMethod")}</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as IndexMethod)}
            >
              <option value="btree">{t("dialogs.namedColumns.methods.btree")}</option>
              <option value="gin">{t("dialogs.namedColumns.methods.gin")}</option>
              <option value="gist">{t("dialogs.namedColumns.methods.gist")}</option>
              <option value="brin">{t("dialogs.namedColumns.methods.brin")}</option>
              <option value="spgist">{t("dialogs.namedColumns.methods.spgist")}</option>
              <option value="hash">{t("dialogs.namedColumns.methods.hash")}</option>
            </select>
          </label>
        )}
        {entity === "unique constraint" && (
          <label>
            <span>{t("dialogs.namedColumns.condition")}</span>
            <input
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder={t("dialogs.namedColumns.conditionPlaceholder")}
            />
          </label>
        )}
        <label>
          <span>{t("dialogs.namedColumns.comment")}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("dialogs.namedColumns.commentPlaceholder", { label })}
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            {t("dialogs.namedColumns.errors.duplicate", { label })}
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            {t("dialogs.namedColumns.errors.valid")}
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            {t("dialogs.namedColumns.errors.reserved")}
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              {t("dialogs.namedColumns.delete", { label })}
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit({
              name: normalizedName,
              columns,
              method: entity === "index" ? method : undefined,
              condition: entity === "unique constraint" ? condition.trim() : undefined,
              comment: comment.trim() === "" ? undefined : comment.trim(),
            })}
          >
            {current ? t("dialogs.namedColumns.save", { label }) : t("dialogs.namedColumns.create", { label })}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
