import { useState } from "react";

import { POSTGRES_RESERVED_WORDS } from "../../core/sql/postgres-reserved-words";
import { CanvasModal } from "./CanvasModal";

type SequenceModalProps = {
    title: string;
    initialName?: string;
    initialStartWith?: number;
    initialIncrementBy?: number;
    existingSequenceNames: string[];
    onClose: () => void;
    onSave: (sequence: {
        name: string;
        startWith: number;
        incrementBy: number;
    }) => void;
};

export function SequenceModal({
    title,
    initialName = "",
    initialStartWith = 1,
    initialIncrementBy = 1,
    existingSequenceNames,
    onClose,
    onSave,
}: SequenceModalProps) {
    const [name, setName] = useState(initialName);
    const [startWith, setStartWith] = useState(initialStartWith);
    const [incrementBy, setIncrementBy] = useState(initialIncrementBy);

    const normalizedName = name.trim();

    const sequenceNameAlreadyExists = existingSequenceNames.some(
        (sequenceName) =>
            sequenceName !== initialName && sequenceName === normalizedName
    );

    const sequenceNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const sequenceNameIsReserved =
        normalizedName !== "" &&
        POSTGRES_RESERVED_WORDS.has(normalizedName.toLowerCase());

    const canSave =
        normalizedName !== "" &&
        sequenceNameIsValid &&
        !sequenceNameIsReserved &&
        !sequenceNameAlreadyExists &&
        Number.isInteger(startWith) &&
        Number.isInteger(incrementBy) &&
        incrementBy !== 0;

    return (
        <CanvasModal title={title} onClose={onClose}>
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
                        onChange={(event) =>
                            setStartWith(Number(event.target.value))
                        }
                    />
                </label>

                <label>
                    <span>Increment by</span>
                    <input
                        type="number"
                        value={incrementBy}
                        onChange={(event) =>
                            setIncrementBy(Number(event.target.value))
                        }
                    />
                </label>

                {sequenceNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        A sequence with this name already exists.
                    </p>
                )}

                {!sequenceNameIsValid && (
                    <p className="canvas-modal-error">
                        Sequence name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}

                {sequenceNameIsReserved && (
                    <p className="canvas-modal-error">
                        Sequence name cannot be a PostgreSQL reserved word.
                    </p>
                )}

                {incrementBy === 0 && (
                    <p className="canvas-modal-error">
                        Increment by cannot be zero.
                    </p>
                )}

                <div className="canvas-modal-actions">
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={() =>
                            onSave({
                                name: normalizedName,
                                startWith,
                                incrementBy,
                            })
                        }
                    >
                        Save sequence
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}