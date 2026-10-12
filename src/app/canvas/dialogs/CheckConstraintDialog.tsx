import { useTranslation } from "react-i18next";
import { useState } from "react";
import { MultiColumnSelect } from "@/app/shared/components/MultiColumnSelect";
import type { DatabaseTable, CheckConstraint } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";
import { SqlEditor } from "@/app/shared/components/SqlEditor";

type Props = {
  table: DatabaseTable;
  current?: CheckConstraint;
  onClose: () => void;
  onSubmit: (input: { name: string; expression: string; columnIds: string[] }) => void;
  onDelete?: () => void;
};

function getSuggestedName(table: DatabaseTable): string {
  const existingNames = new Set(
    (table.checkConstraints ?? []).map((chk) => chk.name.toLowerCase()),
  );
  const baseName = `chk_${table.name}_check`;
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (existingNames.has(`${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
}

export function CheckConstraintDialog({
  table,
  current,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const { t } = useTranslation("canvas");
  const [name, setName] = useState(current?.name ?? getSuggestedName(table));
  const [expression, setExpression] = useState(current?.expression ?? "");
  const [columnIds, setColumnIds] = useState<string[]>(current?.columnIds ?? []);

  const normalizedName = name.trim();
  const normalizedExpression = expression.trim();

  const duplicate = (table.checkConstraints ?? []).some(
    (item) =>
      item.id !== current?.id &&
      item.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);

  const canSubmit =
    normalizedName !== "" &&
    normalizedExpression !== "" &&
    valid &&
    !reserved &&
    !duplicate;

  const columnNameToId = new Map(table.columns.map((c) => [c.name, c.id]));
  const columnIdToName = new Map(table.columns.map((c) => [c.id, c.name]));

  return (
    <CanvasModal
      title={current ? t("dialogs.checkConstraint.editTitle", { name: current.name }) : t("dialogs.checkConstraint.addTitle")}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>{t("dialogs.checkConstraint.name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("dialogs.checkConstraint.namePlaceholder")}
          />
        </label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          <span style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>{t("dialogs.checkConstraint.expression")}</span>
          <SqlEditor
            value={expression}
            onChange={(val) => setExpression(val)}
            placeholder={t("dialogs.checkConstraint.expressionPlaceholder")}
            height="120px"
          />
        </div>
        <label>
          <span>{t("dialogs.checkConstraint.involvedColumns")}</span>
          <MultiColumnSelect
            availableColumns={table.columns.map((column) => column.name)}
            selectedColumns={columnIds.map((id) => columnIdToName.get(id) ?? "")}
            onChange={(names) =>
              setColumnIds(names.map((name) => columnNameToId.get(name) ?? ""))
            }
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            {t("dialogs.checkConstraint.errors.duplicate")}
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            {t("dialogs.checkConstraint.errors.valid")}
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            {t("dialogs.checkConstraint.errors.reserved")}
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              {t("dialogs.checkConstraint.delete")}
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                name: normalizedName,
                expression: normalizedExpression,
                columnIds,
              })
            }
          >
            {current ? t("dialogs.checkConstraint.save") : t("dialogs.checkConstraint.create")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
