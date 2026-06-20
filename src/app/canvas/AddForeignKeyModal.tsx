import { useState } from "react";

import type { DatabaseProject, DatabaseTable } from "../../core/model";
import { CanvasModal } from "./CanvasModal";

const FOREIGN_KEY_ACTIONS = ["NO ACTION", "CASCADE", "RESTRICT", "SET NULL"] as const;

type AddForeignKeyModalProps = {
    project: DatabaseProject;
    sourceTable: DatabaseTable;
    onClose: () => void;
    onCreateForeignKey: (foreignKey: {
        name: string;
        sourceColumn: string;
        targetSchema: string;
        targetTable: string;
        targetColumn: string;
        onUpdate: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
        onDelete: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
    }) => void;
};

export function AddForeignKeyModal({
    project,
    sourceTable,
    onClose,
    onCreateForeignKey,
}: AddForeignKeyModalProps) {
    const firstSchema = project.schemas[0];
    const firstTargetTable = firstSchema?.tables[0];

    const [name, setName] = useState(`fk_${sourceTable.name}_`);
    const [sourceColumn, setSourceColumn] = useState(
        sourceTable.columns[0]?.name ?? ""
    );
    const [targetSchema, setTargetSchema] = useState(firstSchema?.name ?? "");
    const [targetTable, setTargetTable] = useState(firstTargetTable?.name ?? "");
    const [targetColumn, setTargetColumn] = useState(
        firstTargetTable?.columns[0]?.name ?? ""
    );
    const [onUpdate, setOnUpdate] =
        useState<(typeof FOREIGN_KEY_ACTIONS)[number]>("NO ACTION");
    const [onDelete, setOnDelete] =
        useState<(typeof FOREIGN_KEY_ACTIONS)[number]>("NO ACTION");

    const selectedTargetSchema = project.schemas.find(
        (schema) => schema.name === targetSchema
    );

    const selectedTargetTable = selectedTargetSchema?.tables.find(
        (table) => table.name === targetTable
    );

    const normalizedName = name.trim();

    const foreignKeyNameAlreadyExists = sourceTable.foreignKeys.some(
        (foreignKey) => foreignKey.name === normalizedName
    );

    const foreignKeyNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canCreateForeignKey =
        normalizedName !== "" &&
        foreignKeyNameIsValid &&
        !foreignKeyNameAlreadyExists &&
        sourceColumn !== "" &&
        targetSchema !== "" &&
        targetTable !== "" &&
        targetColumn !== "";

    return (
        <CanvasModal title="Add foreign key" onClose={onClose}>
            <div className="canvas-modal-form">
                <label>
                    <span>Name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="fk_table_column"
                    />
                </label>

                <label>
                    <span>Source column</span>
                    <select
                        value={sourceColumn}
                        onChange={(event) => setSourceColumn(event.target.value)}
                    >
                        <option value="">Select source column</option>

                        {sourceTable.columns.map((column) => (
                            <option value={column.name} key={column.id}>
                                {column.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Target schema</span>
                    <select
                        value={targetSchema}
                        onChange={(event) => {
                            const nextSchemaName = event.target.value;
                            const nextSchema = project.schemas.find(
                                (schema) => schema.name === nextSchemaName
                            );
                            const nextTable = nextSchema?.tables[0];

                            setTargetSchema(nextSchemaName);
                            setTargetTable(nextTable?.name ?? "");
                            setTargetColumn(nextTable?.columns[0]?.name ?? "");
                        }}
                    >
                        <option value="">Select target schema</option>

                        {project.schemas.map((schema) => (
                            <option value={schema.name} key={schema.id}>
                                {schema.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Target table</span>
                    <select
                        value={targetTable}
                        onChange={(event) => {
                            const nextTableName = event.target.value;
                            const nextTable = selectedTargetSchema?.tables.find(
                                (table) => table.name === nextTableName
                            );

                            setTargetTable(nextTableName);
                            setTargetColumn(nextTable?.columns[0]?.name ?? "");
                        }}
                    >
                        <option value="">Select target table</option>

                        {selectedTargetSchema?.tables.map((table) => (
                            <option value={table.name} key={table.id}>
                                {table.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Target column</span>
                    <select
                        value={targetColumn}
                        onChange={(event) => setTargetColumn(event.target.value)}
                    >
                        <option value="">Select target column</option>

                        {selectedTargetTable?.columns.map((column) => (
                            <option value={column.name} key={column.id}>
                                {column.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>On update</span>
                    <select
                        value={onUpdate}
                        onChange={(event) =>
                            setOnUpdate(
                                event.target.value as (typeof FOREIGN_KEY_ACTIONS)[number]
                            )
                        }
                    >
                        {FOREIGN_KEY_ACTIONS.map((action) => (
                            <option value={action} key={action}>
                                {action}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>On delete</span>
                    <select
                        value={onDelete}
                        onChange={(event) =>
                            setOnDelete(
                                event.target.value as (typeof FOREIGN_KEY_ACTIONS)[number]
                            )
                        }
                    >
                        {FOREIGN_KEY_ACTIONS.map((action) => (
                            <option value={action} key={action}>
                                {action}
                            </option>
                        ))}
                    </select>
                </label>

                {foreignKeyNameAlreadyExists && (
                    <p className="canvas-modal-error">
                        A foreign key with this name already exists.
                    </p>
                )}

                {!foreignKeyNameIsValid && (
                    <p className="canvas-modal-error">
                        Foreign key name must start with a letter or underscore and contain only letters, numbers, and underscores.
                    </p>
                )}

                <div className="canvas-modal-actions">
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canCreateForeignKey}
                        onClick={() =>
                            onCreateForeignKey({
                                name: normalizedName,
                                sourceColumn,
                                targetSchema,
                                targetTable,
                                targetColumn,
                                onUpdate,
                                onDelete,
                            })
                        }
                    >
                        Create foreign key
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}