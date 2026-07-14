import { isObject, validateRequiredString, validateSqlIdentifier } from "./primitives";

export function validateTrigger(
  trigger: unknown,
  tableName: string,
): void {
  if (!isObject(trigger)) {
    throw new Error(`Invalid trigger in table "${tableName}".`);
  }
  validateRequiredString(trigger.id, `Trigger id in table "${tableName}"`);
  validateSqlIdentifier(trigger.name, `Trigger name in table "${tableName}"`);

  validateRequiredString(trigger.eventTiming, `Trigger "${trigger.name}" eventTiming`);
  if (
    trigger.eventTiming !== "BEFORE" &&
    trigger.eventTiming !== "AFTER" &&
    trigger.eventTiming !== "INSTEAD OF"
  ) {
    throw new Error(
      `Trigger "${trigger.name}" eventTiming must be "BEFORE", "AFTER" or "INSTEAD OF". Got: "${trigger.eventTiming}"`,
    );
  }

  if (!Array.isArray(trigger.events) || trigger.events.length === 0) {
    throw new Error(`Trigger "${trigger.name}" events must be a non-empty array.`);
  }

  trigger.events.forEach((event, idx) => {
    if (
      event !== "INSERT" &&
      event !== "UPDATE" &&
      event !== "DELETE" &&
      event !== "TRUNCATE"
    ) {
      throw new Error(
        `Trigger "${trigger.name}" event at index ${idx} must be "INSERT", "UPDATE", "DELETE" or "TRUNCATE". Got: "${event}"`,
      );
    }
  });

  validateRequiredString(trigger.functionId, `Trigger "${trigger.name}" functionId`);

  if (trigger.condition !== undefined) {
    if (typeof trigger.condition !== "string" || trigger.condition.trim() === "") {
      throw new Error(`Trigger "${trigger.name}" condition must be a non-empty string.`);
    }
  }

  if (trigger.isConstraint !== undefined && typeof trigger.isConstraint !== "boolean") {
    throw new Error(`Trigger "${trigger.name}" isConstraint must be a boolean.`);
  }

  if (trigger.deferrable !== undefined && typeof trigger.deferrable !== "boolean") {
    throw new Error(`Trigger "${trigger.name}" deferrable must be a boolean.`);
  }

  if (trigger.initiallyDeferred !== undefined && typeof trigger.initiallyDeferred !== "boolean") {
    throw new Error(`Trigger "${trigger.name}" initiallyDeferred must be a boolean.`);
  }

  validateRequiredString(trigger.forEach, `Trigger "${trigger.name}" forEach`);
  if (trigger.forEach !== "ROW" && trigger.forEach !== "STATEMENT") {
    throw new Error(
      `Trigger "${trigger.name}" forEach must be "ROW" or "STATEMENT". Got: "${trigger.forEach}"`,
    );
  }
}
