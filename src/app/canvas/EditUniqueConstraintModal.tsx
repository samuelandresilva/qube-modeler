import { useState } from "react";

import type { DatabaseTable, DatabaseUniqueConstraint } from "../../core/model";
import { CanvasModal } from "./CanvasModal";
import { MultiColumnSelect } from "../MultiColumnSelect";

type EditUniqueConstraintModalProps = {
    table: DatabaseTable;
    uniqueConstraint: DatabaseUniqueConstraint;
    onClose: () => void;
    onDeleteUniqueConstraint: (uniqueConstraintId: string) => void;
    onSaveUniqueConstraint: (
        uniqueConstraintId: string,
        uniqueConstraint: {
            name: string;
            columns: string[];
        }
    ) => void;
};

export function EditUniqueConstraintModal({
    table,
    uniqueConstraint,
    onClose,
    onDeleteUniqueConstraint,
    onSaveUniqueConstraint,
}: EditUniqueConstraintModalProps) {
    const [name, setName] = useState(uniqueConstraint.name);
    const [columns, setColumns] = useState<string[]>(uniqueConstraint.columns);

    const normalizedName = name.trim();

    const uniqueNameAlreadyExists = table.uniqueConstraints.some(
        (currentUniqueConstraint) =>
            currentUniqueConstraint.id !== uniqueConstraint.id &&
            currentUniqueConstraint.name === normalizedName
    );

    const uniqueNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canSaveUniqueConstraint =
        normalizedName !== "" &&
        uniqueNameIsValid &&
        !uniqueNameAlreadyExists &&
        columns.length > 0;

    return (
        <CanvasModal
            title={`Edit unique · ${uniqueConstraint.name}`}
            onClose={onClose}
        >
            <div className="canvas-modal-form">
                <label>
                    <span>Name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="uk_table_column"
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

                {uniqueNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        A unique constraint with this name already exists.
                    </p>
                )}

                {!uniqueNameIsValid && (
                    <p className="canvas-modal-error">
                        Unique constraint name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}

                <div className="canvas-modal-actions">
                    <button
                        type="button"
                        className="canvas-modal-actions__danger"
                        onClick={() => {
                            const confirmed = window.confirm(
                                `Remove unique constraint "${uniqueConstraint.name}"?`
                            );

                            if (!confirmed) {
                                return;
                            }

                            onDeleteUniqueConstraint(uniqueConstraint.id);
                        }}
                    >
                        Delete unique
                    </button>

                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canSaveUniqueConstraint}
                        onClick={() =>
                            onSaveUniqueConstraint(uniqueConstraint.id, {
                                name: normalizedName,
                                columns,
                            })
                        }
                    >
                        Save unique
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}