import { useState } from "react";

import {
    getDefaultScale,
    getDefaultSize,
    POSTGRES_COLUMN_TYPES,
    supportsScale,
    supportsSize,
} from "../../core/sql/postgres-column-types";
import { CanvasModal } from "./CanvasModal";
import { POSTGRES_RESERVED_WORDS } from "../../core/sql/postgres-reserved-words";

type AddColumnModalProps = {
    existingColumnNames: string[];
    onClose: () => void;
    onCreateColumn: (column: {
        name: string;
        type: string;
        size?: number;
        scale?: number;
        nullable: boolean;
        primaryKey: boolean;
    }) => void;
};

export function AddColumnModal({
    existingColumnNames,
    onClose,
    onCreateColumn,
}: AddColumnModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState("varchar");
    const [size, setSize] = useState<number | undefined>(255);
    const [scale, setScale] = useState<number | undefined>(undefined);
    const [nullable, setNullable] = useState(true);
    const [primaryKey, setPrimaryKey] = useState(false);

    const normalizedName = name.trim();

    const columnNameAlreadyExists = existingColumnNames.some(
        (columnName) => columnName === normalizedName
    );

    const columnNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const columnNameIsReserved =
        normalizedName !== "" &&
        POSTGRES_RESERVED_WORDS.has(normalizedName.toLowerCase());

    const canCreateColumn =
        normalizedName !== "" &&
        columnNameIsValid &&
        !columnNameIsReserved &&
        !columnNameAlreadyExists;

    return (
        <CanvasModal title="Add column" onClose={onClose}>
            <div className="canvas-modal-form">
                <label>
                    <span>Name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="column_name"
                    />
                </label>

                <label>
                    <span>Type</span>
                    <select
                        value={type}
                        onChange={(event) => {
                            const nextType = event.target.value;

                            setType(nextType);
                            setSize(getDefaultSize(nextType));
                            setScale(getDefaultScale(nextType));
                        }}
                    >
                        {POSTGRES_COLUMN_TYPES.map((columnType) => (
                            <option value={columnType} key={columnType}>
                                {columnType}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Size</span>
                    <input
                        type="number"
                        min="1"
                        value={size ?? ""}
                        disabled={!supportsSize(type)}
                        onChange={(event) =>
                            setSize(
                                event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value)
                            )
                        }
                    />
                </label>

                <label>
                    <span>Scale</span>
                    <input
                        type="number"
                        min="0"
                        value={scale ?? ""}
                        disabled={!supportsScale(type)}
                        onChange={(event) =>
                            setScale(
                                event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value)
                            )
                        }
                    />
                </label>

                <label className="canvas-modal-checkbox">
                    <span>Nullable</span>
                    <input
                        type="checkbox"
                        checked={nullable}
                        onChange={(event) => setNullable(event.target.checked)}
                    />
                </label>

                <label className="canvas-modal-checkbox">
                    <span>Primary key</span>
                    <input
                        type="checkbox"
                        checked={primaryKey}
                        onChange={(event) => setPrimaryKey(event.target.checked)}
                    />
                </label>

                {columnNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        A column with this name already exists.
                    </p>
                )}
                {!columnNameIsValid && (
                    <p className="canvas-modal-error">
                        Column name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}
                {columnNameIsReserved && (
                    <p className="canvas-modal-error">
                        Column name cannot be a PostgreSQL reserved word.
                    </p>
                )}
                <div className="canvas-modal-actions">
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canCreateColumn}
                        onClick={() =>
                            onCreateColumn({
                                name: name.trim(),
                                type,
                                size,
                                scale,
                                nullable,
                                primaryKey,
                            })
                        }
                    >
                        Create column
                    </button>
                </div>

            </div>
        </CanvasModal>
    );
}