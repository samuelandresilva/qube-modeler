import { useState } from "react";
import type { DatabaseSequence, DatabaseSequenceInput } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  sequence?: DatabaseSequence;
  existingNames: string[];
  schemaName: string;
  onClose: () => void;
  onSubmit: (input: DatabaseSequenceInput) => void;
};

export function SequenceDialog({
  sequence,
  existingNames,
  schemaName,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(sequence?.name ?? "");
  const [startWith, setStartWith] = useState(sequence?.startWith ?? 1);
  const [incrementBy, setIncrementBy] = useState(sequence?.incrementBy ?? 1);
  const [comment, setComment] = useState(sequence?.comment ?? "");
  const normalized = name.trim();
  const duplicate = existingNames.some(
    (item) => item !== sequence?.name && item === normalized,
  );
  const valid = normalized === "" || isValidSqlIdentifier(normalized);
  const reserved = normalized !== "" && isPostgresReservedWord(normalized);
  const canSubmit =
    normalized !== "" &&
    valid &&
    !reserved &&
    !duplicate &&
    Number.isInteger(startWith) &&
    Number.isInteger(incrementBy) &&
    incrementBy !== 0;
  return (
    <CanvasModal
      title={
        sequence
          ? `Edit sequence · ${sequence.name}`
          : `Add sequence · ${schemaName}`
      }
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <label>
          <span>Sequence name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="sequence_name"
          />
        </label>
        <label>
          <span>Start with</span>
          <input
            type="number"
            value={startWith}
            onChange={(event) => setStartWith(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Increment by</span>
          <input
            type="number"
            value={incrementBy}
            onChange={(event) => setIncrementBy(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Comment / Documentation</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Describe the sequence's purpose..."
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        {duplicate && (
          <p className="canvas-modal-error">
            A sequence with this name already exists.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Sequence name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Sequence name cannot be a PostgreSQL reserved word.
          </p>
        )}
        {incrementBy === 0 && (
          <p className="canvas-modal-error">Increment cannot be zero.</p>
        )}
        <div className="canvas-modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({ name: normalized, startWith, incrementBy, comment: comment.trim() })
            }
          >
            Save sequence
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
