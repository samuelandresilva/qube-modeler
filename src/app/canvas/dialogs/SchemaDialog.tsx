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
      title={initialName ? `Edit schema · ${initialName}` : "Add schema"}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Schema name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="schema_name"
          />
        </label>
        <label>
          <span>Comment / Documentation</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Describe the schema's purpose..."
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            A schema with this name already exists.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Schema name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Schema name cannot be a PostgreSQL reserved word.
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
            Save schema
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
