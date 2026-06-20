import { useState } from "react";

import type { DatabaseTable } from "../../core/model";
import { CanvasModal } from "./CanvasModal";
import { MultiColumnSelect } from "../MultiColumnSelect";

type AddUniqueConstraintModalProps = {
    table: DatabaseTable;
    onClose: () => void;
    onCreateUniqueConstraint: (uniqueConstraint: {
        name: string;
        columns: string[];
    }) => void;
};

export function AddUniqueConstraintModal({
    table,
    onClose,
    onCreateUniqueConstraint,
}: AddUniqueConstraintModalProps) {
    const [name, setName] = useState(`uk_${table.name}_`);
    const [columns, setColumns] = useState<string[]>([]);

    const normalizedName = name.trim();

    const uniqueNameAlreadyExists = table.uniqueConstraints.some(
        (uniqueConstraint) => uniqueConstraint.name === normalizedName
    );

    const uniqueNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canCreateUniqueConstraint =
        normalizedName !== "" &&
        uniqueNameIsValid &&
        !uniqueNameAlreadyExists &&
        columns.length > 0;

    return (
        <CanvasModal title="Add unique constraint" onClose={onClose}>
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
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canCreateUniqueConstraint}
                        onClick={() =>
                            onCreateUniqueConstraint({
                                name: normalizedName,
                                columns,
                            })
                        }
                    >
                        Create unique
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}