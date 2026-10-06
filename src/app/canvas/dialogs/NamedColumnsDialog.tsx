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
  const label = entity === "index" ? "index" : "unique constraint";

  return (
    <CanvasModal
      title={current ? `Edit ${label} · ${current.name}` : `Add ${label}`}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${prefix}_table_column`}
          />
        </label>
        <label>
          <span>Columns</span>
          <MultiColumnSelect
            availableColumns={table.columns.map((column) => column.name)}
            selectedColumns={columns}
            onChange={setColumns}
          />
        </label>
        {entity === "index" && (
          <label>
            <span>Access Method (USING)</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as IndexMethod)}
            >
              <option value="btree">btree (default - scalar data & sorting)</option>
              <option value="gin">gin (arrays, jsonb, full-text search)</option>
              <option value="gist">gist (geometric, range types, full-text)</option>
              <option value="brin">brin (large sequential datasets)</option>
              <option value="spgist">spgist (space-partitioned data)</option>
              <option value="hash">hash (equality only)</option>
            </select>
          </label>
        )}
        {entity === "unique constraint" && (
          <label>
            <span>Condition (WHERE)</span>
            <input
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder="deleted_at IS NULL"
            />
          </label>
        )}
        <label>
          <span>Comment / Documentation</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={`Describe the ${label}'s purpose...`}
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            A {label} with this name already exists.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Name cannot be a PostgreSQL reserved word.
          </p>
        )}
        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              Delete {label}
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
            {current ? "Save" : "Create"} {label}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
