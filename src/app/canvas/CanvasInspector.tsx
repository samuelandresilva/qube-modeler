import { Plus, Trash2, X } from "lucide-react";
import type { DatabaseTable } from "../../core/model";
import { generatePostgresColumnTypeSql } from "../../core/sql/postgres-column-type-sql";

type CanvasInspectorProps = {
    table: DatabaseTable;
    onClose: () => void;
    onRenameTable: (name: string) => void;
    onDeleteTable: () => void;
    onAddColumn: () => void;
    onEditColumn: (columnId: string) => void;
    onAddForeignKey: () => void;
    onEditForeignKey: (foreignKeyId: string) => void;
    onAddUniqueConstraint: () => void;
    onEditUniqueConstraint: (uniqueConstraintId: string) => void;
    onAddIndex: () => void;
    onEditIndex: (indexId: string) => void;
};

export function CanvasInspector({
    table,
    onClose,
    onRenameTable,
    onDeleteTable,
    onAddColumn,
    onEditColumn,
    onAddForeignKey,
    onEditForeignKey,
    onAddUniqueConstraint,
    onEditUniqueConstraint,
    onAddIndex,
    onEditIndex,
}: CanvasInspectorProps) {
    return (
        <aside className="canvas-inspector">
            <div className="canvas-inspector__header">
                <span>Table</span>
                <button onClick={onClose}><X size={16} /></button>
            </div>

            <input
                className="canvas-inspector__title-input"
                value={table.name}
                onChange={(event) => onRenameTable(event.target.value)}
            />

            <button
                className="canvas-inspector__danger-button"
                type="button"
                onClick={() => {
                    const confirmed = window.confirm(
                        `Remove table "${table.name}"?`
                    );

                    if (!confirmed) {
                        return;
                    }

                    onDeleteTable();
                }}
            >
                <Trash2 size={15} strokeWidth={2.4} />
                <span>Delete table</span>
            </button>

            <div className="canvas-inspector__section">
                <div className="canvas-inspector__section-header">
                    <span className="canvas-inspector__section-title">Columns</span>

                    <button
                        className="canvas-inspector__section-icon-button"
                        type="button"
                        title="Add column"
                        aria-label="Add column"
                        onClick={onAddColumn}
                    >
                        <Plus size={15} strokeWidth={2.6} />
                    </button>
                </div>

                <div className="canvas-inspector__columns">
                    {table.columns.map((column) => (
                        <button
                            className="canvas-inspector__column canvas-inspector__column--button"
                            key={column.id}
                            type="button"
                            onClick={() => onEditColumn(column.id)}
                        >
                            <span>
                                {column.primaryKey ? "🔑 " : ""}
                                {column.name}
                            </span>

                            <small>{generatePostgresColumnTypeSql(column)}</small>
                        </button>
                    ))}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <div className="canvas-inspector__section-header">
                    <span className="canvas-inspector__section-title">Foreign keys</span>

                    <button
                        className="canvas-inspector__section-icon-button"
                        type="button"
                        title="Add foreign key"
                        aria-label="Add foreign key"
                        onClick={onAddForeignKey}
                    >
                        <Plus size={15} strokeWidth={2.6} />
                    </button>
                </div>

                <div className="canvas-inspector__columns">
                    {table.foreignKeys.length === 0 ? (
                        <p className="canvas-inspector__empty">No foreign keys.</p>
                    ) : (
                        table.foreignKeys.map((foreignKey) => (
                            <button
                                className="canvas-inspector__column canvas-inspector__column--button"
                                key={foreignKey.id}
                                type="button"
                                onClick={() => onEditForeignKey(foreignKey.id)}
                            >
                                <span>{foreignKey.name}</span>

                                <small>
                                    {foreignKey.sourceColumns.join(", ")} →{" "}
                                    {foreignKey.targetTable}.
                                    {foreignKey.targetColumns.join(", ")}
                                </small>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <div className="canvas-inspector__section-header">
                    <span className="canvas-inspector__section-title">
                        Unique constraints
                    </span>

                    <button
                        className="canvas-inspector__section-icon-button"
                        type="button"
                        title="Add unique constraint"
                        aria-label="Add unique constraint"
                        onClick={onAddUniqueConstraint}
                    >
                        <Plus size={15} strokeWidth={2.6} />
                    </button>
                </div>

                <div className="canvas-inspector__columns">
                    {table.uniqueConstraints.length === 0 ? (
                        <p className="canvas-inspector__empty">
                            No unique constraints.
                        </p>
                    ) : (
                        table.uniqueConstraints.map((uniqueConstraint) => (
                            <button
                                className="canvas-inspector__column canvas-inspector__column--button"
                                key={uniqueConstraint.id}
                                type="button"
                                onClick={() => onEditUniqueConstraint(uniqueConstraint.id)}
                            >
                                <span>{uniqueConstraint.name}</span>
                                <small>{uniqueConstraint.columns.join(", ")}</small>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <div className="canvas-inspector__section-header">
                    <span className="canvas-inspector__section-title">Indexes</span>

                    <button
                        className="canvas-inspector__section-icon-button"
                        type="button"
                        title="Add index"
                        aria-label="Add index"
                        onClick={onAddIndex}
                    >
                        <Plus size={15} strokeWidth={2.6} />
                    </button>
                </div>

                <div className="canvas-inspector__columns">
                    {table.indexes.length === 0 ? (
                        <p className="canvas-inspector__empty">No indexes.</p>
                    ) : (
                        table.indexes.map((index) => (
                            <button
                                className="canvas-inspector__column canvas-inspector__column--button"
                                key={index.id}
                                type="button"
                                onClick={() => onEditIndex(index.id)}
                            >
                                <span>{index.name}</span>
                                <small>{index.columns.join(", ")}</small>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
}