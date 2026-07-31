import type { Dispatch, SetStateAction } from "react";
import {
  createColumn,
  createForeignKey,
  createIndex,
  createSchema,
  createSequence,
  createUniqueConstraint,
  createCheckConstraint,
  findTableContext,
  findViewContext,
  removeColumn,
  removeForeignKey,
  removeIndex,
  removeUniqueConstraint,
  removeCheckConstraint,
  updateColumn,
  updateForeignKey,
  updateIndex,
  updateSchema,
  updateSequence,
  updateUniqueConstraint,
  updateCheckConstraint,
  createDatabaseFunction,
  updateDatabaseFunction,
  removeDatabaseFunction,
  createTrigger,
  updateTrigger,
  removeTrigger,
  createViewTrigger,
  updateViewTrigger,
  removeViewTrigger,
  updateDatabaseView,
  type DatabaseProject,
  type DatabaseTrigger,
} from "@/core/model";
import { ColumnDialog } from "./ColumnDialog";
import type { CanvasDialogState } from "./dialog-state";
import { ForeignKeyDialog } from "./ForeignKeyDialog";
import { NamedColumnsDialog } from "./NamedColumnsDialog";
import { SchemaDialog } from "./SchemaDialog";
import { SequenceDialog } from "./SequenceDialog";
import { CheckConstraintDialog } from "./CheckConstraintDialog";
import { FunctionDialog } from "./FunctionDialog";
import { TriggerDialog } from "./TriggerDialog";
import { ViewDefinitionDialog } from "./ViewDefinitionDialog";

type Props = {
  dialog: CanvasDialogState;
  setDialog: (dialog: CanvasDialogState) => void;
  project: DatabaseProject;
  setProject: Dispatch<SetStateAction<DatabaseProject>>;
  selectedTableId: string | null;
  requestConfirm: (message: string, onConfirm: () => void) => void;
  onCommitHistory: (currentProject: DatabaseProject) => void;
};

export function CanvasDialogs({
  dialog,
  setDialog,
  project,
  setProject,
  selectedTableId,
  requestConfirm,
  onCommitHistory,
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
        key={schema?.id ?? "new_schema"}
        initialName={schema?.name}
        initialComment={schema?.comment}
        existingNames={project.schemas.map((item) => item.name)}
        onClose={close}
        onSubmit={(name, comment) => {
          onCommitHistory(project);
          setProject((current) =>
            schema
              ? updateSchema(current, schema.id, (item) => ({ ...item, name, comment }))
              : createSchema(current, name, comment).project,
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
        key={sequence?.id ?? "new_sequence"}
        sequence={sequence}
        schemaName={schema.name}
        existingNames={schema.sequences.map((item) => item.name)}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
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
  if (dialog.kind === "function") {
    const schema = project.schemas.find((item) => item.id === dialog.schemaId);
    const databaseFunction = (project.functions ?? []).find(
      (item) => item.id === dialog.functionId,
    );
    if (!schema) return null;
    return (
      <FunctionDialog
        key={databaseFunction?.id ?? "new_function"}
        project={project}
        editingFunction={databaseFunction}
        initialSchemaId={schema.id}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
          setProject((current) =>
            databaseFunction
              ? updateDatabaseFunction(current, databaseFunction.id, input)
              : createDatabaseFunction(current, input).project
          );
          close();
        }}
        onDelete={
          databaseFunction
            ? () =>
                requestConfirmDelete(
                  requestConfirm,
                  `function "${databaseFunction.name}"`,
                  () =>
                    setProject((current) =>
                      removeDatabaseFunction(current, databaseFunction.id)
                    ),
                  close,
                )
            : undefined
        }
      />
    );
  }
  if (dialog.kind === "view-definition") {
    const viewCtx = findViewContext(project, dialog.viewId);
    if (!viewCtx) return null;
    return (
      <ViewDefinitionDialog
        key={viewCtx.view.id}
        initialValue={viewCtx.view.definition}
        viewName={viewCtx.view.name}
        onClose={close}
        onSubmit={(value) => {
          onCommitHistory(project);
          setProject((current) =>
            updateDatabaseView(current, viewCtx.view.id, (view) => ({
              ...view,
              definition: value,
            })),
          );
          close();
        }}
      />
    );
  }
  if (dialog && dialog.kind === "trigger" && dialog.parentType === "view") {
    const parentId = dialog.parentId ?? selectedTableId;
    const viewCtx = parentId ? findViewContext(project, parentId) : undefined;
    if (!viewCtx) return null;

    const trigger = (viewCtx.view.triggers ?? []).find(
      (item: DatabaseTrigger) => item.id === dialog.triggerId,
    );

    return (
      <TriggerDialog
        key={trigger?.id ?? "new_view_trigger"}
        project={project}
        table={viewCtx.view}
        entityType="view"
        current={trigger}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
          setProject((current) =>
            trigger
              ? updateViewTrigger(current, viewCtx.view.id, trigger.id, (item) => ({ ...item, ...input }))
              : createViewTrigger(current, viewCtx.view.id, input).project
          );
          close();
        }}
        onDelete={
          trigger
            ? () => requestConfirmDelete(requestConfirm, `trigger "${trigger.name}"`, () =>
                setProject((current) => removeViewTrigger(current, viewCtx.view.id, trigger.id)), close
              )
            : undefined
        }
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
        key={column?.id ?? "new_column"}
        column={column}
        existingColumnNames={context.table.columns.map((item) => item.name)}
        availableSequenceNames={context.schema.sequences.map(
          (item) => item.name,
        )}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
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
        key={foreignKey?.id ?? "new_fk"}
        project={project}
        sourceTable={context.table}
        foreignKey={foreignKey}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
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
        key={constraint?.id ?? "new_uc"}
        entity="unique constraint"
        table={context.table}
        current={constraint}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
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
  if (dialog.kind === "check-constraint") {
    const constraint = (context.table.checkConstraints ?? []).find(
      (item) => item.id === dialog.constraintId,
    );
    return (
      <CheckConstraintDialog
        key={constraint?.id ?? "new_cc"}
        table={context.table}
        current={constraint}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
          setProject((current) =>
            constraint
              ? updateCheckConstraint(
                  current,
                  context.schema.id,
                  context.table.id,
                  constraint.id,
                  (item) => ({ ...item, ...input }),
                )
              : createCheckConstraint(
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
                  `CHECK constraint "${constraint.name}"`,
                  () =>
                    setProject((current) =>
                      removeCheckConstraint(
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
  if (dialog.kind === "trigger") {
    const parentId = dialog.parentId ?? selectedTableId;
    const tableCtx = parentId ? findTableContext(project, parentId) : undefined;
    if (!tableCtx) return null;
    const trigger = (tableCtx.table.triggers ?? []).find(
      (item: DatabaseTrigger) => item.id === dialog.triggerId,
    );
    return (
      <TriggerDialog
        key={trigger?.id ?? "new_trigger"}
        project={project}
        table={tableCtx.table}
        entityType="table"
        current={trigger}
        onClose={close}
        onSubmit={(input) => {
          onCommitHistory(project);
          setProject((current) =>
            trigger
              ? updateTrigger(
                  current,
                  tableCtx.schema.id,
                  tableCtx.table.id,
                  trigger.id,
                  (item: DatabaseTrigger) => ({ ...item, ...input }),
                )
              : createTrigger(
                  current,
                  tableCtx.schema.id,
                  tableCtx.table.id,
                  input,
                ).project,
          );
          close();
        }}
        onDelete={
          trigger
            ? () =>
                requestConfirmDelete(
                  requestConfirm,
                  `trigger "${trigger.name}"`,
                  () =>
                    setProject((current) =>
                      removeTrigger(
                        current,
                        tableCtx.schema.id,
                        tableCtx.table.id,
                        trigger.id,
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
      key={index?.id ?? "new_index"}
      entity="index"
      table={context.table}
      current={index}
      onClose={close}
      onSubmit={(input) => {
        onCommitHistory(project);
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
