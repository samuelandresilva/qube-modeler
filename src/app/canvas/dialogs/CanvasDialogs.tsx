import type { Dispatch, SetStateAction } from "react";
import {
  createColumn,
  createForeignKey,
  createIndex,
  createSchema,
  createSequence,
  createUniqueConstraint,
  findTableContext,
  removeColumn,
  removeForeignKey,
  removeIndex,
  removeUniqueConstraint,
  updateColumn,
  updateForeignKey,
  updateIndex,
  updateSchema,
  updateSequence,
  updateUniqueConstraint,
  type DatabaseProject,
} from "@/core/model";
import { ColumnDialog } from "./ColumnDialog";
import type { CanvasDialogState } from "./dialog-state";
import { ForeignKeyDialog } from "./ForeignKeyDialog";
import { NamedColumnsDialog } from "./NamedColumnsDialog";
import { SchemaDialog } from "./SchemaDialog";
import { SequenceDialog } from "./SequenceDialog";

type Props = {
  dialog: CanvasDialogState;
  setDialog: (dialog: CanvasDialogState) => void;
  project: DatabaseProject;
  setProject: Dispatch<SetStateAction<DatabaseProject>>;
  selectedTableId: string | null;
  requestConfirm: (message: string, onConfirm: () => void) => void;
};

export function CanvasDialogs({
  dialog,
  setDialog,
  project,
  setProject,
  selectedTableId,
  requestConfirm,
}: Props) {
  if (!dialog) return null;
  const close = () => setDialog(null);
  const context = selectedTableId
    ? findTableContext(project, selectedTableId)
    : undefined;

  if (dialog.kind === "schema") {
    const schema = project.schemas.find((item) => item.id === dialog.schemaId);
    return (
      <SchemaDialog
        initialName={schema?.name}
        existingNames={project.schemas.map((item) => item.name)}
        onClose={close}
        onSubmit={(name) => {
          setProject((current) =>
            schema
              ? updateSchema(current, schema.id, (item) => ({ ...item, name }))
              : createSchema(current, name).project,
          );
          close();
        }}
      />
    );
  }
  if (dialog.kind === "sequence") {
    const schema = project.schemas.find((item) => item.id === dialog.schemaId);
    const sequence = schema?.sequences.find(
      (item) => item.id === dialog.sequenceId,
    );
    if (!schema) return null;
    return (
      <SequenceDialog
        sequence={sequence}
        schemaName={schema.name}
        existingNames={schema.sequences.map((item) => item.name)}
        onClose={close}
        onSubmit={(input) => {
          setProject((current) =>
            sequence
              ? updateSequence(current, schema.id, sequence.id, (item) => ({
                  ...item,
                  ...input,
                }))
              : createSequence(current, schema.id, input).project,
          );
          close();
        }}
      />
    );
  }
  if (!context) return null;
  if (dialog.kind === "column") {
    const column = context.table.columns.find(
      (item) => item.id === dialog.columnId,
    );
    return (
      <ColumnDialog
        column={column}
        existingColumnNames={context.table.columns.map((item) => item.name)}
        availableSequenceNames={context.schema.sequences.map(
          (item) => item.name,
        )}
        onClose={close}
        onSubmit={(input) => {
          setProject((current) =>
            column
              ? updateColumn(
                  current,
                  context.schema.id,
                  context.table.id,
                  column.id,
                  (item) => ({ ...item, ...input }),
                )
              : createColumn(
                  current,
                  context.schema.id,
                  context.table.id,
                  input,
                ).project,
          );
          close();
        }}
        onDelete={
          column
            ? () =>
                requestConfirmDelete(
                  requestConfirm,
                  `column "${column.name}"`,
                  () =>
                    setProject((current) =>
                      removeColumn(
                        current,
                        context.schema.id,
                        context.table.id,
                        column.id,
                      ),
                    ),
                  close,
                )
            : undefined
        }
      />
    );
  }
  if (dialog.kind === "foreign-key") {
    const foreignKey = context.table.foreignKeys.find(
      (item) => item.id === dialog.foreignKeyId,
    );
    return (
      <ForeignKeyDialog
        project={project}
        sourceTable={context.table}
        foreignKey={foreignKey}
        onClose={close}
        onSubmit={(input) => {
          setProject((current) =>
            foreignKey
              ? updateForeignKey(
                  current,
                  context.schema.id,
                  context.table.id,
                  foreignKey.id,
                  (item) => ({ ...item, ...input }),
                )
              : createForeignKey(
                  current,
                  context.schema.id,
                  context.table.id,
                  input,
                ).project,
          );
          close();
        }}
        onDelete={
          foreignKey
            ? () =>
                requestConfirmDelete(
                  requestConfirm,
                  `foreign key "${foreignKey.name}"`,
                  () =>
                    setProject((current) =>
                      removeForeignKey(
                        current,
                        context.schema.id,
                        context.table.id,
                        foreignKey.id,
                      ),
                    ),
                  close,
                )
            : undefined
        }
      />
    );
  }
  if (dialog.kind === "unique-constraint") {
    const constraint = context.table.uniqueConstraints.find(
      (item) => item.id === dialog.constraintId,
    );
    return (
      <NamedColumnsDialog
        entity="unique constraint"
        table={context.table}
        current={constraint}
        onClose={close}
        onSubmit={(input) => {
          setProject((current) =>
            constraint
              ? updateUniqueConstraint(
                  current,
                  context.schema.id,
                  context.table.id,
                  constraint.id,
                  (item) => ({ ...item, ...input }),
                )
              : createUniqueConstraint(
                  current,
                  context.schema.id,
                  context.table.id,
                  input,
                ).project,
          );
          close();
        }}
        onDelete={
          constraint
            ? () =>
                requestConfirmDelete(
                  requestConfirm,
                  `unique constraint "${constraint.name}"`,
                  () =>
                    setProject((current) =>
                      removeUniqueConstraint(
                        current,
                        context.schema.id,
                        context.table.id,
                        constraint.id,
                      ),
                    ),
                  close,
                )
            : undefined
        }
      />
    );
  }
  const index = context.table.indexes.find(
    (item) => item.id === dialog.indexId,
  );
  return (
    <NamedColumnsDialog
      entity="index"
      table={context.table}
      current={index}
      onClose={close}
      onSubmit={(input) => {
        setProject((current) =>
          index
            ? updateIndex(
                current,
                context.schema.id,
                context.table.id,
                index.id,
                (item) => ({ ...item, ...input }),
              )
            : createIndex(current, context.schema.id, context.table.id, input)
                .project,
        );
        close();
      }}
      onDelete={
        index
          ? () =>
              requestConfirmDelete(
                requestConfirm,
                `index "${index.name}"`,
                () =>
                  setProject((current) =>
                    removeIndex(
                      current,
                      context.schema.id,
                      context.table.id,
                      index.id,
                    ),
                  ),
                close,
              )
          : undefined
      }
    />
  );
}

function requestConfirmDelete(
  requestConfirm: (message: string, onConfirm: () => void) => void,
  label: string,
  remove: () => void,
  close: () => void,
) {
  requestConfirm(`Remove ${label}?`, () => {
    remove();
    close();
  });
}
