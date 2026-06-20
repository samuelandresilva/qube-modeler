import type { DatabaseTable } from "../../core/model";
import { generatePostgresColumnTypeSql } from "../../core/sql/postgres-column-type-sql";

type CanvasInspectorProps = {
    table: DatabaseTable;
    onClose: () => void;
};

export function CanvasInspector({ table, onClose }: CanvasInspectorProps) {
    return (
        <aside className="canvas-inspector">
            <div className="canvas-inspector__header">
                <span>Table</span>
                <button onClick={onClose}>×</button>
            </div>

            <strong>{table.name}</strong>

            <p>
                {table.columns.length} columns · {table.foreignKeys.length} foreign keys
            </p>

            <div className="canvas-inspector__section">
                <span className="canvas-inspector__section-title">Columns</span>

                <div className="canvas-inspector__columns">
                    {table.columns.map((column) => (
                        <div className="canvas-inspector__column" key={column.id}>
                            <span>
                                {column.primaryKey ? "🔑 " : ""}
                                {column.name}
                            </span>

                            <small>{generatePostgresColumnTypeSql(column)}</small>
                        </div>
                    ))}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <span className="canvas-inspector__section-title">Foreign keys</span>

                <div className="canvas-inspector__columns">
                    {table.foreignKeys.length === 0 ? (
                        <p className="canvas-inspector__empty">No foreign keys.</p>
                    ) : (
                        table.foreignKeys.map((foreignKey) => (
                            <div className="canvas-inspector__column" key={foreignKey.id}>
                                <span>{foreignKey.name}</span>

                                <small>
                                    {foreignKey.sourceColumns.join(", ")} →{" "}
                                    {foreignKey.targetTable}.
                                    {foreignKey.targetColumns.join(", ")}
                                </small>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <span className="canvas-inspector__section-title">
                    Unique constraints
                </span>

                <div className="canvas-inspector__columns">
                    {table.uniqueConstraints.length === 0 ? (
                        <p className="canvas-inspector__empty">
                            No unique constraints.
                        </p>
                    ) : (
                        table.uniqueConstraints.map((uniqueConstraint) => (
                            <div
                                className="canvas-inspector__column"
                                key={uniqueConstraint.id}
                            >
                                <span>{uniqueConstraint.name}</span>
                                <small>{uniqueConstraint.columns.join(", ")}</small>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="canvas-inspector__section">
                <span className="canvas-inspector__section-title">Indexes</span>

                <div className="canvas-inspector__columns">
                    {table.indexes.length === 0 ? (
                        <p className="canvas-inspector__empty">No indexes.</p>
                    ) : (
                        table.indexes.map((index) => (
                            <div className="canvas-inspector__column" key={index.id}>
                                <span>{index.name}</span>
                                <small>{index.columns.join(", ")}</small>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
}