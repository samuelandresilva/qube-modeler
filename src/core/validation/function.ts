import { isObject, validateRequiredString } from "./primitives";
import type { DatabaseFunction } from "../model/types";

export function validateDatabaseFunction(
  fn: unknown,
  schemas: unknown[],
): DatabaseFunction {
  if (!isObject(fn)) {
    throw new Error("Invalid function definition.");
  }

  // function.id obrigatório.
  validateRequiredString(fn.id, "Function id");

  // schemaId obrigatório e deve existir.
  validateRequiredString(fn.schemaId, "Function schemaId");
  
  const schemaExists = Array.isArray(schemas) && schemas.some((schema) => {
    return isObject(schema) && schema.id === fn.schemaId;
  });
  if (!schemaExists) {
    throw new Error(`Schema with id "${fn.schemaId}" does not exist.`);
  }

  // name obrigatório.
  validateRequiredString(fn.name, "Function name");

  // language obrigatória e limitada a "plpgsql" | "sql".
  validateRequiredString(fn.language, "Function language");
  if (fn.language !== "plpgsql" && fn.language !== "sql") {
    throw new Error(`Function language must be "plpgsql" or "sql". Got: "${fn.language}"`);
  }

  // returnType obrigatório.
  validateRequiredString(fn.returnType, "Function returnType");

  // body obrigatório.
  validateRequiredString(fn.body, "Function body");

  // arguments deve ser array.
  if (!Array.isArray(fn.arguments)) {
    throw new Error(`Function "${fn.name}" arguments must be an array.`);
  }

  // cada argument deve ter id obrigatório, dataType obrigatório, name obrigatório.
  // mode, se informado, deve ser "IN", "OUT" ou "INOUT".
  fn.arguments.forEach((arg, index) => {
    if (!isObject(arg)) {
      throw new Error(`Invalid argument at index ${index} in function "${fn.name}".`);
    }
    validateRequiredString(arg.id, `Argument id at index ${index} in function "${fn.name}"`);
    validateRequiredString(arg.name, `Argument name at index ${index} in function "${fn.name}"`);
    validateRequiredString(arg.dataType, `Argument dataType at index ${index} in function "${fn.name}"`);
    
    if (arg.mode !== undefined) {
      if (arg.mode !== "IN" && arg.mode !== "OUT" && arg.mode !== "INOUT") {
        throw new Error(`Argument mode must be "IN", "OUT" or "INOUT". Got: "${arg.mode}"`);
      }
    }
  });

  return fn as unknown as DatabaseFunction;
}
