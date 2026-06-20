import { useState } from "react";

import type { DatabaseForeignKey, DatabaseProject, DatabaseTable } from "../../core/model";
import { CanvasModal } from "./CanvasModal";

const FOREIGN_KEY_ACTIONS = ["NO ACTION", "CASCADE", "RESTRICT", "SET NULL"] as const;

type ForeignKeyAction = (typeof FOREIGN_KEY_ACTIONS)[number];

type EditForeignKeyModalProps = {
    project: DatabaseProject;
    sourceTable: DatabaseTable;
    foreignKey: DatabaseForeignKey;
    onClose: () => void;
    onDeleteForeignKey: (foreignKeyId: string) => void;
    onSaveForeignKey: (
        foreignKeyId: string,
        foreignKey: {
            name: string;
            sourceColumn: string;
            targetSchema: string;
            targetTable: string;
            targetColumn: string;
            onUpdate: ForeignKeyAction;
            onDelete: ForeignKeyAction;
        }
    ) => void;
};

export function EditForeignKeyModal({
    project,
    sourceTable,
    foreignKey,
    onClose,
    onDeleteForeignKey,
    onSaveForeignKey,
}: EditForeignKeyModalProps) {
    const [name, setName] = useState(foreignKey.name);
    const [sourceColumn, setSourceColumn] = useState(foreignKey.sourceColumns[0] ?? "");
    const [targetSchema, setTargetSchema] = useState(foreignKey.targetSchema);
    const [targetTable, setTargetTable] = useState(foreignKey.targetTable);
    const [targetColumn, setTargetColumn] = useState(foreignKey.targetColumns[0] ?? "");
    const [onUpdate, setOnUpdate] = useState<ForeignKeyAction>(
        foreignKey.onUpdate ?? "NO ACTION"
    );
    const [onDelete, setOnDelete] = useState<ForeignKeyAction>(
        foreignKey.onDelete ?? "NO ACTION"
    );

    const selectedTargetSchema = project.schemas.find(
        (schema) => schema.name === targetSchema
    );

    const selectedTargetTable = selectedTargetSchema?.tables.find(
        (table) => table.name === targetTable
    );

    const normalizedName = name.trim();

    const foreignKeyNameAlreadyExists = sourceTable.foreignKeys.some(
        (currentForeignKey) =>
            currentForeignKey.id !== foreignKey.id &&
            currentForeignKey.name === normalizedName
    );

    const foreignKeyNameIsValid =
        normalizedName === "" ||
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName);

    const canSaveForeignKey =
        normalizedName !== "" &&
        foreignKeyNameIsValid &&
        !foreignKeyNameAlreadyExists &&
        sourceColumn !== "" &&
        targetSchema !== "" &&
        targetTable !== "" &&
        targetColumn !== "";

    return (
        <CanvasModal title={`Edit foreign key · ${foreignKey.name}`} onClose={onClose}>
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
                            setOnUpdate(event.target.value as ForeignKeyAction)
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
                            setOnDelete(event.target.value as ForeignKeyAction)
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
                    <button
                        type="button"
                        className="canvas-modal-actions__danger"
                        onClick={() => {
                            const confirmed = window.confirm(
                                `Remove foreign key "${foreignKey.name}"?`
                            );

                            if (!confirmed) {
                                return;
                            }

                            onDeleteForeignKey(foreignKey.id);
                        }}
                    >
                        Delete FK
                    </button>

                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!canSaveForeignKey}
                        onClick={() =>
                            onSaveForeignKey(foreignKey.id, {
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
                        Save FK
                    </button>
                </div>
            </div>
        </CanvasModal>
    );
}