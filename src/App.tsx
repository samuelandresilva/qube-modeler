import { useState } from "react";
import "./App.css";
import { downloadFile } from "./app/download-file";
import { MultiColumnSelect } from "./app/MultiColumnSelect";
import { readJsonFile } from "./app/read-json-file";
import {
  addColumn,
  addForeignKey,
  addIndex,
  addSchema,
  addSequence,
  addTable,
  addUniqueConstraint,
  removeColumn,
  removeForeignKey,
  removeIndex,
  removeSchema,
  removeSequence,
  removeTable,
  removeUniqueConstraint,
  updateColumn,
  updateForeignKey,
  updateIndex,
  updateSchema,
  updateSequence,
  updateTable,
  updateUniqueConstraint,
  type DatabaseProject
} from "./core/model";
import {
  getDefaultScale,
  getDefaultSize,
  POSTGRES_COLUMN_TYPES,
  supportsScale,
  supportsSize,
} from "./core/sql/postgres-column-types";
import { generatePostgresSql } from "./core/sql/postgres-generator";
import { validateProject } from "./core/validation/validate-project";

type AppProps = {
  project: DatabaseProject;
  setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
};

export default function App({ project, setProject }: AppProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sql = generatePostgresSql(project);

  function handleDownloadJson() {
    try {
      const validProject = validateProject(project);
      const content = JSON.stringify(validProject, null, 2);

      downloadFile(
        "qube-modeler-project.json",
        content,
        "application/json;charset=utf-8"
      );

      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not download project file.";

      setErrorMessage(message);
    }
  }

  function handleDownloadSql() {
    try {
      const validProject = validateProject(project);
      const validSql = generatePostgresSql(validProject);

      downloadFile(
        "V001__initial_schema.sql",
        validSql,
        "text/sql;charset=utf-8"
      );

      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not download SQL file.";

      setErrorMessage(message);
    }
  }

  async function handleLoadJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const loadedProject = await readJsonFile<unknown>(file);
      const validProject = validateProject(loadedProject);

      setProject(validProject);
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load project file.";

      setErrorMessage(message);
    } finally {
      event.target.value = "";
    }
  }

  function handleAddSchema() {
    setProject((currentProject) => addSchema(currentProject));
  }

  function handleRemoveSchema(schemaId: string, schemaName: string) {
    if (project.schemas.length <= 1) {
      window.alert("O projeto precisa ter pelo menos um schema.");
      return;
    }

    const shouldRemove = window.confirm(
      `Deseja realmente remover o schema "${schemaName}"?\n\nTodas as tabelas, colunas e sequences deste schema serão removidas.\nAs foreign keys de outros schemas que apontam para este schema também serão removidas.`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) => removeSchema(currentProject, schemaId));
  }

  function handleAddSequence(schemaId: string) {
    setProject((currentProject) => addSequence(currentProject, schemaId));
  }

  function handleRemoveSequence(
    schemaId: string,
    sequenceId: string,
    sequenceName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover a sequence "${sequenceName}"?\n\nAs colunas que usam esta sequence ficarão sem sequence.`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeSequence(currentProject, schemaId, sequenceId)
    );
  }

  function handleAddTable(schemaId: string) {
    setProject((currentProject) => addTable(currentProject, schemaId));
  }

  function handleRemoveTable(
    schemaId: string,
    tableId: string,
    tableName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover a tabela "${tableName}"?\n\nTodas as colunas, foreign keys, unique constraints e indexes desta tabela serão removidos.\nAs foreign keys de outras tabelas que apontam para esta tabela também serão removidas.`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeTable(currentProject, schemaId, tableId)
    );
  }

  function handleAddColumn(schemaId: string, tableId: string) {
    setProject((currentProject) => addColumn(currentProject, schemaId, tableId));
  }

  function handleRemoveColumn(
    schemaId: string,
    tableId: string,
    columnId: string,
    columnName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover a coluna "${columnName}"?\n\nAs foreign keys, unique constraints e indexes que usam ou apontam para esta coluna também serão removidos.`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeColumn(currentProject, schemaId, tableId, columnId)
    );
  }

  function handleAddForeignKey(schemaId: string, tableId: string) {
    setProject((currentProject) =>
      addForeignKey(currentProject, schemaId, tableId)
    );
  }

  function handleRemoveForeignKey(
    schemaId: string,
    tableId: string,
    foreignKeyId: string,
    foreignKeyName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover a foreign key "${foreignKeyName}"?`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeForeignKey(currentProject, schemaId, tableId, foreignKeyId)
    );
  }

  function findSchemaByName(schemaName: string) {
    return project.schemas.find((schema) => schema.name === schemaName);
  }

  function findTableByName(schemaName: string, tableName: string) {
    const targetSchema = findSchemaByName(schemaName);

    return targetSchema?.tables.find((table) => table.name === tableName);
  }

  function handleAddUniqueConstraint(schemaId: string, tableId: string) {
    setProject((currentProject) =>
      addUniqueConstraint(currentProject, schemaId, tableId)
    );
  }

  function handleRemoveUniqueConstraint(
    schemaId: string,
    tableId: string,
    uniqueConstraintId: string,
    uniqueConstraintName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover a unique constraint "${uniqueConstraintName}"?`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeUniqueConstraint(
        currentProject,
        schemaId,
        tableId,
        uniqueConstraintId
      )
    );
  }

  function handleAddIndex(schemaId: string, tableId: string) {
    setProject((currentProject) => addIndex(currentProject, schemaId, tableId));
  }

  function handleRemoveIndex(
    schemaId: string,
    tableId: string,
    indexId: string,
    indexName: string
  ) {
    const shouldRemove = window.confirm(
      `Deseja realmente remover o index "${indexName}"?`
    );

    if (!shouldRemove) {
      return;
    }

    setProject((currentProject) =>
      removeIndex(currentProject, schemaId, tableId, indexId)
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">PostgreSQL + Flyway</p>
          <h1 className="app-title">Qube Modeler</h1>
          <p className="app-subtitle">
            Visual database modeling stored as JSON.
          </p>
        </div>

        <div className="toolbar">
          <button type="button" onClick={handleDownloadJson}>
            Download JSON
          </button>

          <button type="button" onClick={handleDownloadSql}>
            Download SQL
          </button>

          <label className="file-button">
            Load JSON
            <input
              type="file"
              accept="application/json"
              onChange={handleLoadJson}
            />
          </label>
        </div>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <section className="layout">
        <aside className="sidebar">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Project</h2>
            </div>

            <div className="panel-body">
              <div className="form-group">
                <label>Project name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(event) =>
                    setProject({
                      ...project,
                      name: event.target.value,
                    })
                  }
                />
              </div>

              <div className="readonly-row">
                <span>Engine</span>
                <strong>{project.engine}</strong>
              </div>

              {project.schemas.map((schema) => (
                <div className="schema-item" key={schema.id}>
                  <div className="form-group">
                    <label>Schema name</label>
                    <input
                      type="text"
                      value={schema.name}
                      onChange={(event) =>
                        setProject(
                          updateSchema(project, schema.id, (currentSchema) => ({
                            ...currentSchema,
                            name: event.target.value,
                          }))
                        )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="danger-button full-width-button"
                    onClick={() => handleRemoveSchema(schema.id, schema.name)}
                  >
                    Remove schema
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="secondary-button full-width-button"
                onClick={handleAddSchema}
              >
                Add schema
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Sequences</h2>
            </div>

            <div className="panel-body">
              {project.schemas.map((schema) => (
                <div className="schema-sequences" key={schema.id}>
                  <div className="schema-sequences-header">
                    <h3 className="sidebar-subtitle">{schema.name}</h3>

                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleAddSequence(schema.id)}
                    >
                      Add
                    </button>
                  </div>

                  {schema.sequences.length === 0 ? (
                    <p className="empty-message">No sequences.</p>
                  ) : (
                    <div className="model-list">
                      {schema.sequences.map((sequence) => (
                        <div className="model-card compact" key={sequence.id}>
                          <div className="form-group">
                            <label>Sequence name</label>
                            <input
                              type="text"
                              value={sequence.name}
                              onChange={(event) =>
                                setProject(
                                  updateSequence(
                                    project,
                                    schema.id,
                                    sequence.id,
                                    (currentSequence) => ({
                                      ...currentSequence,
                                      name: event.target.value,
                                    })
                                  )
                                )
                              }
                            />
                          </div>

                          <div className="sequence-grid">
                            <div className="form-group">
                              <label>Start</label>
                              <input
                                type="number"
                                value={sequence.startWith}
                                onChange={(event) =>
                                  setProject(
                                    updateSequence(
                                      project,
                                      schema.id,
                                      sequence.id,
                                      (currentSequence) => ({
                                        ...currentSequence,
                                        startWith: Number(event.target.value),
                                      })
                                    )
                                  )
                                }
                              />
                            </div>

                            <div className="form-group">
                              <label>Increment</label>
                              <input
                                type="number"
                                value={sequence.incrementBy}
                                onChange={(event) =>
                                  setProject(
                                    updateSequence(
                                      project,
                                      schema.id,
                                      sequence.id,
                                      (currentSequence) => ({
                                        ...currentSequence,
                                        incrementBy: Number(event.target.value),
                                      })
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="danger-button full-width-button"
                            onClick={() =>
                              handleRemoveSequence(schema.id, sequence.id, sequence.name)
                            }
                          >
                            Remove sequence
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="workspace">
          {project.schemas.map((schema) => (
            <section className="panel" key={schema.id}>
              <div className="panel-header">
                <h2>Tables · {schema.name}</h2>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleAddTable(schema.id)}
                >
                  Add table
                </button>
              </div>

              <div className="panel-body">
                <div className="table-grid">
                  {schema.tables.map((table) => (
                    <article className="table-card" key={table.id}>
                      <div className="table-card-header">
                        <h3>{table.name}</h3>
                        <span>{table.columns.length} columns</span>
                      </div>

                      <div className="form-group">
                        <label>Table name</label>
                        <div className="table-card-header">
                          <input
                            type="text"
                            value={table.name}
                            onChange={(event) =>
                              setProject(
                                updateTable(
                                  project,
                                  schema.id,
                                  table.id,
                                  (currentTable) => ({
                                    ...currentTable,
                                    name: event.target.value,
                                  })
                                )
                              )
                            }
                          />

                          <div className="table-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleAddColumn(schema.id, table.id)}
                            >
                              Add column
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleAddForeignKey(schema.id, table.id)}
                            >
                              Add FK
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleAddUniqueConstraint(schema.id, table.id)}
                            >
                              Add Unique
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleAddIndex(schema.id, table.id)}
                            >
                              Add Index
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() =>
                                handleRemoveTable(schema.id, table.id, table.name)
                              }
                            >
                              Remove table
                            </button>
                          </div>
                        </div>
                      </div>

                      <ul className="column-list">
                        {table.columns.map((column) => (
                          <li className="column-item" key={column.id}>
                            <div className="column-summary">
                              <strong>{column.name}</strong>
                              <span>{column.type}</span>

                              {column.primaryKey ? (
                                <span className="badge">PK</span>
                              ) : null}

                              {!column.nullable ? (
                                <span className="badge">NOT NULL</span>
                              ) : null}

                              {column.sequenceName ? (
                                <span className="badge">
                                  SEQ {column.sequenceName}
                                </span>
                              ) : null}
                            </div>

                            <div className="column-form">
                              <div className="form-group">
                                <label>Column name</label>
                                <input
                                  type="text"
                                  value={column.name}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          name: event.target.value,
                                        })
                                      )
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() =>
                                    handleRemoveColumn(
                                      schema.id,
                                      table.id,
                                      column.id,
                                      column.name
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="form-group">
                                <label>Column type</label>
                                <select
                                  value={column.type}
                                  onChange={(event) => {
                                    const nextType = event.target.value;

                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          type: nextType,
                                          size: getDefaultSize(nextType),
                                          scale: getDefaultScale(nextType),
                                        })
                                      )
                                    );
                                  }}
                                >
                                  {POSTGRES_COLUMN_TYPES.map((type) => (
                                    <option value={type} key={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label>Size</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={column.size ?? ""}
                                  disabled={!supportsSize(column.type)}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          size:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Scale</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={column.scale ?? ""}
                                  disabled={!supportsScale(column.type)}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          scale:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Default value</label>
                                <input
                                  type="text"
                                  value={column.defaultValue ?? ""}
                                  placeholder={
                                    column.sequenceName
                                      ? "Disabled because sequence is selected"
                                      : "CURRENT_TIMESTAMP"
                                  }
                                  disabled={Boolean(column.sequenceName)}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          defaultValue:
                                            event.target.value.trim() === ""
                                              ? undefined
                                              : event.target.value,
                                          sequenceName:
                                            event.target.value.trim() === ""
                                              ? currentColumn.sequenceName
                                              : undefined,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Sequence</label>
                                <select
                                  value={column.sequenceName ?? ""}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          sequenceName:
                                            event.target.value === ""
                                              ? undefined
                                              : event.target.value,
                                          defaultValue:
                                            event.target.value === ""
                                              ? currentColumn.defaultValue
                                              : undefined,
                                        })
                                      )
                                    )
                                  }
                                >
                                  <option value="">No sequence</option>

                                  {schema.sequences.map((sequence) => (
                                    <option value={sequence.name} key={sequence.id}>
                                      {sequence.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label className="checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={!column.nullable}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          nullable: !event.target.checked,
                                        })
                                      )
                                    )
                                  }
                                />
                                Not null
                              </label>

                              <label className="checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={column.primaryKey}
                                  onChange={(event) =>
                                    setProject(
                                      updateColumn(
                                        project,
                                        schema.id,
                                        table.id,
                                        column.id,
                                        (currentColumn) => ({
                                          ...currentColumn,
                                          primaryKey: event.target.checked,
                                        })
                                      )
                                    )
                                  }
                                />
                                Primary key
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {table.foreignKeys.length > 0 ? (
                        <div className="foreign-key-list">
                          <h4>Foreign keys</h4>

                          {table.foreignKeys.map((foreignKey) => (
                            <div className="foreign-key-item" key={foreignKey.id}>
                              <div className="form-group">
                                <label>FK name</label>
                                <input
                                  type="text"
                                  value={foreignKey.name}
                                  onChange={(event) =>
                                    setProject(
                                      updateForeignKey(
                                        project,
                                        schema.id,
                                        table.id,
                                        foreignKey.id,
                                        (currentForeignKey) => ({
                                          ...currentForeignKey,
                                          name: event.target.value,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Source column</label>
                                <select
                                  value={foreignKey.sourceColumns[0] ?? ""}
                                  onChange={(event) =>
                                    setProject(
                                      updateForeignKey(
                                        project,
                                        schema.id,
                                        table.id,
                                        foreignKey.id,
                                        (currentForeignKey) => ({
                                          ...currentForeignKey,
                                          sourceColumns:
                                            event.target.value === ""
                                              ? []
                                              : [event.target.value],
                                        })
                                      )
                                    )
                                  }
                                >
                                  <option value="">Select column</option>

                                  {table.columns.map((sourceColumn) => (
                                    <option value={sourceColumn.name} key={sourceColumn.id}>
                                      {sourceColumn.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label>Target schema</label>
                                <select
                                  value={foreignKey.targetSchema}
                                  onChange={(event) =>
                                    setProject(
                                      updateForeignKey(
                                        project,
                                        schema.id,
                                        table.id,
                                        foreignKey.id,
                                        (currentForeignKey) => ({
                                          ...currentForeignKey,
                                          targetSchema: event.target.value,
                                          targetTable: "",
                                          targetColumns: [],
                                        })
                                      )
                                    )
                                  }
                                >
                                  {project.schemas.map((targetSchema) => (
                                    <option value={targetSchema.name} key={targetSchema.id}>
                                      {targetSchema.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label>Target table</label>
                                <select
                                  value={foreignKey.targetTable}
                                  onChange={(event) =>
                                    setProject(
                                      updateForeignKey(
                                        project,
                                        schema.id,
                                        table.id,
                                        foreignKey.id,
                                        (currentForeignKey) => ({
                                          ...currentForeignKey,
                                          targetTable: event.target.value,
                                          targetColumns: [],
                                        })
                                      )
                                    )
                                  }
                                >
                                  <option value="">Select table</option>

                                  {(findSchemaByName(foreignKey.targetSchema)?.tables ?? []).map(
                                    (targetTable) => (
                                      <option value={targetTable.name} key={targetTable.id}>
                                        {targetTable.name}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div className="form-group">
                                <label>Target column</label>
                                <select
                                  value={foreignKey.targetColumns[0] ?? ""}
                                  onChange={(event) =>
                                    setProject(
                                      updateForeignKey(
                                        project,
                                        schema.id,
                                        table.id,
                                        foreignKey.id,
                                        (currentForeignKey) => ({
                                          ...currentForeignKey,
                                          targetColumns:
                                            event.target.value === ""
                                              ? []
                                              : [event.target.value],
                                        })
                                      )
                                    )
                                  }
                                >
                                  <option value="">Select column</option>

                                  {(
                                    findTableByName(
                                      foreignKey.targetSchema,
                                      foreignKey.targetTable
                                    )?.columns ?? []
                                  ).map((targetColumn) => (
                                    <option value={targetColumn.name} key={targetColumn.id}>
                                      {targetColumn.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="sequence-grid">
                                <div className="form-group">
                                  <label>On update</label>
                                  <select
                                    value={foreignKey.onUpdate ?? "NO ACTION"}
                                    onChange={(event) =>
                                      setProject(
                                        updateForeignKey(
                                          project,
                                          schema.id,
                                          table.id,
                                          foreignKey.id,
                                          (currentForeignKey) => ({
                                            ...currentForeignKey,
                                            onUpdate: event.target.value as
                                              | "NO ACTION"
                                              | "CASCADE"
                                              | "RESTRICT"
                                              | "SET NULL",
                                          })
                                        )
                                      )
                                    }
                                  >
                                    <option value="NO ACTION">NO ACTION</option>
                                    <option value="CASCADE">CASCADE</option>
                                    <option value="RESTRICT">RESTRICT</option>
                                    <option value="SET NULL">SET NULL</option>
                                  </select>
                                </div>

                                <div className="form-group">
                                  <label>On delete</label>
                                  <select
                                    value={foreignKey.onDelete ?? "NO ACTION"}
                                    onChange={(event) =>
                                      setProject(
                                        updateForeignKey(
                                          project,
                                          schema.id,
                                          table.id,
                                          foreignKey.id,
                                          (currentForeignKey) => ({
                                            ...currentForeignKey,
                                            onDelete: event.target.value as
                                              | "NO ACTION"
                                              | "CASCADE"
                                              | "RESTRICT"
                                              | "SET NULL",
                                          })
                                        )
                                      )
                                    }
                                  >
                                    <option value="NO ACTION">NO ACTION</option>
                                    <option value="CASCADE">CASCADE</option>
                                    <option value="RESTRICT">RESTRICT</option>
                                    <option value="SET NULL">SET NULL</option>
                                  </select>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="danger-button full-width-button"
                                onClick={() =>
                                  handleRemoveForeignKey(
                                    schema.id,
                                    table.id,
                                    foreignKey.id,
                                    foreignKey.name
                                  )
                                }
                              >
                                Remove FK
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {table.uniqueConstraints.length > 0 ? (
                        <div className="unique-constraint-list">
                          <h4>Unique constraints</h4>

                          {table.uniqueConstraints.map((uniqueConstraint) => (
                            <div className="unique-constraint-item" key={uniqueConstraint.id}>
                              <div className="form-group">
                                <label>Unique name</label>
                                <input
                                  type="text"
                                  value={uniqueConstraint.name}
                                  onChange={(event) =>
                                    setProject(
                                      updateUniqueConstraint(
                                        project,
                                        schema.id,
                                        table.id,
                                        uniqueConstraint.id,
                                        (currentUniqueConstraint) => ({
                                          ...currentUniqueConstraint,
                                          name: event.target.value,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Columns</label>

                                <MultiColumnSelect
                                  availableColumns={table.columns.map((column) => column.name)}
                                  selectedColumns={uniqueConstraint.columns}
                                  onChange={(columns) =>
                                    setProject(
                                      updateUniqueConstraint(
                                        project,
                                        schema.id,
                                        table.id,
                                        uniqueConstraint.id,
                                        (currentUniqueConstraint) => ({
                                          ...currentUniqueConstraint,
                                          columns,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                className="danger-button full-width-button"
                                onClick={() =>
                                  handleRemoveUniqueConstraint(
                                    schema.id,
                                    table.id,
                                    uniqueConstraint.id,
                                    uniqueConstraint.name
                                  )
                                }
                              >
                                Remove Unique
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {table.indexes.length > 0 ? (
                        <div className="index-list">
                          <h4>Indexes</h4>

                          {table.indexes.map((index) => (
                            <div className="index-item" key={index.id}>
                              <div className="form-group">
                                <label>Index name</label>
                                <input
                                  type="text"
                                  value={index.name}
                                  onChange={(event) =>
                                    setProject(
                                      updateIndex(
                                        project,
                                        schema.id,
                                        table.id,
                                        index.id,
                                        (currentIndex) => ({
                                          ...currentIndex,
                                          name: event.target.value,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div className="form-group">
                                <label>Columns</label>

                                <MultiColumnSelect
                                  availableColumns={table.columns.map((column) => column.name)}
                                  selectedColumns={index.columns}
                                  onChange={(columns) =>
                                    setProject(
                                      updateIndex(
                                        project,
                                        schema.id,
                                        table.id,
                                        index.id,
                                        (currentIndex) => ({
                                          ...currentIndex,
                                          columns,
                                        })
                                      )
                                    )
                                  }
                                />
                              </div>

                              <button
                                type="button"
                                className="danger-button full-width-button"
                                onClick={() =>
                                  handleRemoveIndex(
                                    schema.id,
                                    table.id,
                                    index.id,
                                    index.name
                                  )
                                }
                              >
                                Remove Index
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                    </article>
                  ))}
                </div>
              </div>
            </section>
          ))}

          <section className="panel sql-panel">
            <div className="panel-header">
              <h2 className="panel-title">Generated SQL</h2>
            </div>

            <pre className="sql-preview">
              <code>{sql}</code>
            </pre>
          </section>
        </section>
      </section>
    </main>
  );
}