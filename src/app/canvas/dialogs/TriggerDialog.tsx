import { useState } from "react";
import type { DatabaseTable, DatabaseTrigger, DatabaseProject, DatabaseView } from "@/core/model";
import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  project: DatabaseProject;
  table: DatabaseTable | DatabaseView;
  entityType?: "table" | "view";
  current?: DatabaseTrigger;
  onClose: () => void;
  onSubmit: (input: Omit<DatabaseTrigger, "id">) => void;
  onDelete?: () => void;
};

function getSuggestedName(table: DatabaseTable | DatabaseView): string {
  const existingNames = new Set(
    (table.triggers ?? []).map((trg: DatabaseTrigger) => trg.name.toLowerCase()),
  );
  const baseName = `trg_${table.name}_change`;
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (existingNames.has(`${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
}

export function TriggerDialog({
  project,
  table,
  entityType = "table",
  current,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const isView = entityType === "view";
  const [name, setName] = useState(current?.name ?? getSuggestedName(table));
  const [eventTiming, setEventTiming] = useState<DatabaseTrigger["eventTiming"]>(
    isView ? "INSTEAD OF" : (current?.isConstraint ? "AFTER" : (current?.eventTiming ?? "BEFORE"))
  );
  const [events, setEvents] = useState<DatabaseTrigger["events"]>(
    current?.events ?? ["INSERT"]
  );
  const [forEach, setForEach] = useState<DatabaseTrigger["forEach"]>(
    isView ? "ROW" : (current?.isConstraint ? "ROW" : (current?.forEach ?? "ROW"))
  );
  const [functionId, setFunctionId] = useState(current?.functionId ?? "");
  const [condition, setCondition] = useState(current?.condition ?? "");
  const [isConstraint, setIsConstraint] = useState(!isView && (current?.isConstraint ?? false));
  const [deferrable, setDeferrable] = useState(!isView && (current?.deferrable ?? false));
  const [initiallyDeferred, setInitiallyDeferred] = useState(!isView && (current?.initiallyDeferred ?? false));

  // Filter trigger functions
  const triggerFunctions = (project.functions ?? []).filter(
    (fn) => fn.returnType.toLowerCase() === "trigger"
  );

  // Auto-select function if only one exists and functionId is empty
  const defaultFunctionId = functionId === "" && triggerFunctions.length > 0
    ? triggerFunctions[0].id
    : functionId;

  if (functionId === "" && defaultFunctionId !== "") {
    setFunctionId(defaultFunctionId);
  }

  const normalizedName = name.trim();
  const normalizedCondition = condition.trim();

  const duplicate = (table.triggers ?? []).some(
    (item: DatabaseTrigger) =>
      item.id !== current?.id &&
      item.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  const valid = normalizedName === "" || isValidSqlIdentifier(normalizedName);
  const reserved =
    normalizedName !== "" && isPostgresReservedWord(normalizedName);

  const canSubmit =
    normalizedName !== "" &&
    events.length > 0 &&
    functionId !== "" &&
    valid &&
    !reserved &&
    !duplicate;

  const toggleEvent = (event: DatabaseTrigger["events"][number]) => {
    if (events.includes(event)) {
      setEvents(events.filter((e) => e !== event));
    } else {
      setEvents([...events, event]);
    }
  };

  const handleConstraintChange = (checked: boolean) => {
    if (isView) return;
    setIsConstraint(checked);
    if (checked) {
      setEventTiming("AFTER");
      setForEach("ROW");
    } else {
      setDeferrable(false);
      setInitiallyDeferred(false);
    }
  };

  const handleForEachChange = (val: DatabaseTrigger["forEach"]) => {
    if (isView) return;
    setForEach(val);
    if (val === "STATEMENT") {
      setCondition("");
    }
  };

  return (
    <CanvasModal
      title={current ? `Edit trigger · ${current.name}` : "Add trigger"}
      onClose={onClose}
    >
      <div className="canvas-modal-form">
        <div className="canvas-modal-form__row">
          <label>
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="trg_table_change"
            />
          </label>
          <label>
            <span>Function</span>
            {triggerFunctions.length === 0 ? (
              <select disabled value="">
                <option value="">No trigger functions found</option>
              </select>
            ) : (
              <select
                value={functionId}
                onChange={(event) => setFunctionId(event.target.value)}
              >
                {triggerFunctions.map((fn) => {
                  const schema = project.schemas.find((s) => s.id === fn.schemaId);
                  const label = schema ? `${schema.name}.${fn.name}` : fn.name;
                  return (
                    <option key={fn.id} value={fn.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </label>
        </div>

        {triggerFunctions.length === 0 && (
          <p className="canvas-modal-error">
            No trigger functions found. Create a function that returns 'trigger' first.
          </p>
        )}

        <div className="canvas-modal-form__row">
          <label>
            <span>Timing</span>
            {isView ? (
              <select value="INSTEAD OF" disabled>
                <option value="INSTEAD OF">INSTEAD OF</option>
              </select>
            ) : (
              <select
                value={isConstraint ? "AFTER" : eventTiming}
                disabled={isConstraint}
                onChange={(event) => setEventTiming(event.target.value as DatabaseTrigger["eventTiming"])}
              >
                <option value="BEFORE">BEFORE</option>
                <option value="AFTER">AFTER</option>
              </select>
            )}
          </label>
          <label>
            <span>For Each (Orientation)</span>
            <select
              value={isView ? "ROW" : (isConstraint ? "ROW" : forEach)}
              disabled={isView || isConstraint}
              onChange={(event) => handleForEachChange(event.target.value as DatabaseTrigger["forEach"])}
            >
              <option value="ROW">ROW</option>
              <option value="STATEMENT">STATEMENT</option>
            </select>
          </label>
        </div>

        <div>
          <span style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 800, display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Events</span>
          <div className="canvas-modal-form__row" style={{ marginBottom: "8px" }}>
            <label className="canvas-modal-checkbox">
              <span>INSERT</span>
              <input
                type="checkbox"
                checked={events.includes("INSERT")}
                onChange={() => toggleEvent("INSERT")}
              />
            </label>
            <label className="canvas-modal-checkbox">
              <span>UPDATE</span>
              <input
                type="checkbox"
                checked={events.includes("UPDATE")}
                onChange={() => toggleEvent("UPDATE")}
              />
            </label>
          </div>
          <div className="canvas-modal-form__row">
            <label className="canvas-modal-checkbox">
              <span>DELETE</span>
              <input
                type="checkbox"
                checked={events.includes("DELETE")}
                onChange={() => toggleEvent("DELETE")}
              />
            </label>
            <label className="canvas-modal-checkbox">
              <span>TRUNCATE</span>
              <input
                type="checkbox"
                checked={events.includes("TRUNCATE")}
                onChange={() => toggleEvent("TRUNCATE")}
              />
            </label>
          </div>
        </div>

        <label>
          <span>WHEN Condition (Optional)</span>
          <input
            value={condition}
            disabled={!isView && forEach === "STATEMENT"}
            onChange={(event) => setCondition(event.target.value)}
            placeholder={(!isView && forEach === "STATEMENT") ? "Not supported for STATEMENT" : "NEW.age > 18"}
          />
          {!isView && forEach === "STATEMENT" && (
            <span style={{ color: "#38bdf8", fontSize: "11px", marginTop: "2px" }}>
              WHEN clause is not supported for STATEMENT
            </span>
          )}
        </label>

        {!isView && (
          <div className="canvas-modal-form__row" style={{ marginTop: "6px" }}>
            <label className="canvas-modal-checkbox">
              <span>Constraint Trigger</span>
              <input
                type="checkbox"
                checked={isConstraint}
                onChange={(event) => handleConstraintChange(event.target.checked)}
              />
            </label>
            {isConstraint && (
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <label className="canvas-modal-checkbox" style={{ flex: 1 }}>
                  <span>DEFERRABLE</span>
                  <input
                    type="checkbox"
                    checked={deferrable}
                    onChange={(event) => setDeferrable(event.target.checked)}
                  />
                </label>
                <label className="canvas-modal-checkbox" style={{ flex: 1 }}>
                  <span>INITIALLY DEFERRED</span>
                  <input
                    type="checkbox"
                    checked={initiallyDeferred}
                    disabled={!deferrable}
                    onChange={(event) => setInitiallyDeferred(event.target.checked)}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {duplicate && (
          <p className="canvas-modal-error">
            A trigger with this name already exists on this {isView ? "view" : "table"}.
          </p>
        )}
        {!valid && (
          <p className="canvas-modal-error">
            Name must be a valid SQL identifier.
          </p>
        )}
        {reserved && (
          <p className="canvas-modal-error">
            Name cannot be a PostgreSQL reserved word.
          </p>
        )}
        {events.length === 0 && (
          <p className="canvas-modal-error">
            Select at least one event (INSERT, UPDATE, DELETE or TRUNCATE).
          </p>
        )}

        <div className="canvas-modal-actions">
          {onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              onClick={onDelete}
            >
              Delete trigger
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                name: normalizedName,
                eventTiming: isView ? "INSTEAD OF" : (isConstraint ? "AFTER" : eventTiming),
                events,
                functionId,
                condition: (isView || forEach === "ROW") && normalizedCondition !== "" ? normalizedCondition : undefined,
                isConstraint: isView ? false : isConstraint,
                deferrable: !isView && isConstraint ? deferrable : undefined,
                initiallyDeferred: !isView && isConstraint ? initiallyDeferred : undefined,
                forEach: isView ? "ROW" : (isConstraint ? "ROW" : forEach),
              })
            }
          >
            {current ? "Save" : "Create"} trigger
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
