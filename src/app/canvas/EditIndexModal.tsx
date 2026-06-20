import { useState } from "react";

import type { DatabaseIndex, DatabaseTable } from "../../core/model";
import { CanvasModal } from "./CanvasModal";
import { MultiColumnSelect } from "../MultiColumnSelect";

type EditIndexModalProps = {
    table: DatabaseTable;
    index: DatabaseIndex;
    onClose: () => void;
    onDeleteIndex: (indexId: string) => void;
    onSaveIndex: (
        indexId: string,
        index: {
            name: string;
            columns: string[];
        }
    ) => void;
};

export function EditIndexModal({
    table,
    index,
    onClose,
    onDeleteIndex,
    onSaveIndex,
}: EditIndexModalProps) {
    const [name, setName] = useState(index.name);
    const [columns, setColumns] = useState<string[]>(index.columns);

    const normalizedName = name.trim();

    const indexNameAlreadyExists = table.indexes.some(
        (currentIndex) =>
            currentIndex.id !== index.id &&
            currentIndex.name === normalizedName
    );

    const indexNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canSaveIndex =
        normalizedName !== "" &&
        indexNameIsValid &&
        !indexNameAlreadyExists &&
        columns.length > 0;

    return (
        <CanvasModal title={`Edit index · ${index.name}`} onClose={onClose}>
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
                    <button
                        type="button"
                        className="canvas-modal-actions__danger"
                        onClick={() => {
                            const confirmed = window.confirm(
                                `Remove index "${index.name}"?`
                            );

                            if (!confirmed) {
                                return;
                            }

                            onDeleteIndex(index.id);
                        }}
                    >
                        Delete index
                    </button>

                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canSaveIndex}
                        onClick={() =>
                            onSaveIndex(index.id, {
                                name: normalizedName,
                                columns,
                            })
                        }
                    >
                        Save index
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}