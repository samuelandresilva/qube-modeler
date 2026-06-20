import { useState } from "react";

import type { DatabaseTable } from "../../core/model";
import { CanvasModal } from "./CanvasModal";
import { MultiColumnSelect } from "../MultiColumnSelect";

type AddIndexModalProps = {
    table: DatabaseTable;
    onClose: () => void;
    onCreateIndex: (index: {
        name: string;
        columns: string[];
    }) => void;
};

export function AddIndexModal({
    table,
    onClose,
    onCreateIndex,
}: AddIndexModalProps) {
    const [name, setName] = useState(`idx_${table.name}_`);
    const [columns, setColumns] = useState<string[]>([]);

    const normalizedName = name.trim();

    const indexNameAlreadyExists = table.indexes.some(
        (index) => index.name === normalizedName
    );

    const indexNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canCreateIndex =
        normalizedName !== "" &&
        indexNameIsValid &&
        !indexNameAlreadyExists &&
        columns.length > 0;

    return (
        <CanvasModal title="Add index" onClose={onClose}>
            <div className="canvas-modal-form">
                <label>
                    <span>Name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="idx_table_column"
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

                {indexNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        An index with this name already exists.
                    </p>
                )}

                {!indexNameIsValid && (
                    <p className="canvas-modal-error">
                        Index name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}

                <div className="canvas-modal-actions">
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canCreateIndex}
                        onClick={() =>
                            onCreateIndex({
                                name: normalizedName,
                                columns,
                            })
                        }
                    >
                        Create index
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}