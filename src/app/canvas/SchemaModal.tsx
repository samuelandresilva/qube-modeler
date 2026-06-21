import { useState } from "react";

import { POSTGRES_RESERVED_WORDS } from "../../core/sql/postgres-reserved-words";
import { CanvasModal } from "./CanvasModal";

type SchemaModalProps = {
    title: string;
    initialName?: string;
    existingSchemaNames: string[];
    onClose: () => void;
    onSave: (name: string) => void;
};

export function SchemaModal({
    title,
    initialName = "",
    existingSchemaNames,
    onClose,
    onSave,
}: SchemaModalProps) {
    const [name, setName] = useState(initialName);

    const normalizedName = name.trim();

    const schemaNameAlreadyExists = existingSchemaNames.some(
        (schemaName) =>
            schemaName !== initialName && schemaName === normalizedName
    );

    const schemaNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const schemaNameIsReserved =
        normalizedName !== "" &&
        POSTGRES_RESERVED_WORDS.has(normalizedName.toLowerCase());

    const canSave =
        normalizedName !== "" &&
        schemaNameIsValid &&
        !schemaNameIsReserved &&
        !schemaNameAlreadyExists;

    return (
        <CanvasModal title={title} onClose={onClose}>
            <div className="canvas-modal-form">
                <label>
                    <span>Schema name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="schema_name"
                    />
                </label>

                {schemaNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        A schema with this name already exists.
                    </p>
                )}

                {!schemaNameIsValid && (
                    <p className="canvas-modal-error">
                        Schema name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}

                {schemaNameIsReserved && (
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
                        disabled={!canSave}
                        onClick={() => onSave(normalizedName)}
                    >
                        Save schema
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}