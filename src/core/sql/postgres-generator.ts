import type {
  DatabaseColumn,
  DatabaseForeignKey,
  DatabaseProject,
  DatabaseSchema,
  DatabaseSequence,
  DatabaseTable,
  DatabaseUniqueConstraint,
  DatabaseIndex,
  CheckConstraint,
  DatabaseFunction,
  DatabaseFunctionArgument,
  DatabaseTrigger,
  DatabaseView,
} from "@/core/model";
import { supportsScale, supportsSize } from "./postgres-column-types";

export function generatePostgresSql(project: DatabaseProject): string {
  const primaryKeys: string[] = [];
  const uniqueConstraints: string[] = [];
  const foreignKeys: string[] = [];

  const schemaDefinitions = project.schemas
    .map((schema) => `CREATE SCHEMA IF NOT EXISTS ${schema.name};`)
    .join("\n");

  project.schemas.forEach((schema) => {
    schema.tables.forEach((table) => {
      const primaryKeySql = generateAddPrimaryKeySql(schema, table);
      if (primaryKeySql) {
        primaryKeys.push(primaryKeySql);
      }
      table.uniqueConstraints.forEach((constraint) => {
        uniqueConstraints.push(generateAddUniqueConstraintSql(schema, table, constraint));
      });
      table.foreignKeys.forEach((foreignKey) => {
        foreignKeys.push(generateAddForeignKeySql(schema, table, foreignKey));
      });
    });
  });

  const schemaObjects = project.schemas
    .map((schema) => generateSchemaObjectsSql(schema, project))
    .filter(Boolean)
    .join("\n\n");

  const finalSqlParts = [
    schemaDefinitions,
    schemaObjects,
  ];

  if (primaryKeys.length > 0) {
    finalSqlParts.push("-- Primary Keys", ...primaryKeys);
  }
  if (uniqueConstraints.length > 0) {
    finalSqlParts.push("-- Unique Constraints", ...uniqueConstraints);
  }
  if (foreignKeys.length > 0) {
    finalSqlParts.push("-- Foreign Keys", ...foreignKeys);
  }

  return finalSqlParts.filter(Boolean).join("\n\n");
}

function generateSchemaObjectsSql(
  schema: DatabaseSchema,
  project: DatabaseProject,
): string {
  const sequenceSql = schema.sequences.map((sequence) =>
    generateSequenceSql(schema, sequence),
  );

  const functions = project.functions ?? [];
  const schemaFunctions = functions.filter((fn) => fn.schemaId === schema.id);
  const functionSql = schemaFunctions.map((fn) =>
    generateFunctionSql(schema, fn),
  );

  const tableSql = schema.tables.map((table) =>
    generateTableSql(schema, table, { includeConstraints: false }),
  );

  const views = project.views ?? [];
  const schemaViews = views.filter((view) => view.schemaId === schema.id);
  const viewSql = schemaViews.map((view) =>
    generateViewSql(schema, view),
  );

  const triggerSql = schema.tables.flatMap((table) =>
    (table.triggers ?? []).map((trigger) =>
      generateTriggerSql(schema, table, trigger, project),
    ),
  );

  const indexSql = schema.tables.flatMap((table) =>
    table.indexes.map((index) => generateIndexSql(schema, table, index)),
  );

  return [
    ...sequenceSql,
    ...functionSql,
    ...tableSql,
    ...viewSql,
    ...triggerSql,
    ...indexSql,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function generateFunctionSql(
  schema: DatabaseSchema,
  fn: DatabaseFunction,
): string {
  const argsSql = generateFunctionArgsSql(fn.arguments ?? []);
  return [
    `CREATE OR REPLACE FUNCTION ${schema.name}.${fn.name}(${argsSql})`,
    `RETURNS ${fn.returnType} AS $$`,
    fn.body,
    `$$ LANGUAGE ${fn.language};`,
  ].join("\n");
}

export function generateFunctionArgsSql(args: DatabaseFunctionArgument[]): string {
  return args
    .map((arg) => {
      const modePrefix = arg.mode ? `${arg.mode} ` : "";
      const namePart = arg.name ? `${arg.name} ` : "";
      return `${modePrefix}${namePart}${arg.dataType}`;
    })
    .join(", ");
}

export function generateSequenceSql(
  schema: DatabaseSchema,
  sequence: DatabaseSequence,
): string {
  return [
    `CREATE SEQUENCE IF NOT EXISTS ${schema.name}.${sequence.name}`,
    `    START WITH ${sequence.startWith}`,
    `    INCREMENT BY ${sequence.incrementBy};`,
  ].join("\n");
}

export function generateTableSql(
  schema: DatabaseSchema,
  table: DatabaseTable,
  options: { includeConstraints?: boolean } = {},
): string {
  const includeConstraints = options.includeConstraints ?? true;
  const columnLines = table.columns.map((column) =>
    generateColumnSql(schema, column),
  );

  const checkConstraints = table.checkConstraints ?? [];
  const checkLines = checkConstraints.map(generateCheckConstraintSql);

  const lines = includeConstraints
    ? [
        ...columnLines,
        ...generateInlineTableConstraintSql(table),
      ]
    : [
        ...columnLines,
        ...checkLines,
      ];

  return [
    `CREATE TABLE IF NOT EXISTS ${schema.name}.${table.name}`,
    `(`,
    lines
      .map((line, index) => `${line}${index < lines.length - 1 ? "," : ""}`)
      .join("\n"),
    `);`,
  ].join("\n");
}

export function generateTablePostCreateSql(
  schema: DatabaseSchema,
  table: DatabaseTable,
): string[] {
  const primaryKeySql = generateAddPrimaryKeySql(schema, table);
  const uniqueConstraintSql = table.uniqueConstraints.map((constraint) =>
    generateAddUniqueConstraintSql(schema, table, constraint),
  );
  const foreignKeySql = table.foreignKeys.map((foreignKey) =>
    generateAddForeignKeySql(schema, table, foreignKey),
  );

  return [
    ...(primaryKeySql ? [primaryKeySql] : []),
    ...uniqueConstraintSql,
    ...foreignKeySql,
  ];
}

function generateInlineTableConstraintSql(table: DatabaseTable): string[] {
  const primaryKeyColumns = table.columns
    .filter((column) => column.primaryKey)
    .map((column) => column.name);

  const primaryKeyConstraintLines =
    primaryKeyColumns.length > 0
      ? [
          `    CONSTRAINT pk_${table.name} PRIMARY KEY (${primaryKeyColumns.join(
            ", ",
          )})`,
        ]
      : [];

  const uniqueConstraintLines = table.uniqueConstraints
    .filter((uc) => !uc.condition)
    .map(generateUniqueConstraintSql);

  const checkConstraints = table.checkConstraints ?? [];
  const checkConstraintLines = checkConstraints.map(generateCheckConstraintSql);

  const foreignKeyConstraintLines = table.foreignKeys.map(
    generateForeignKeySql,
  );

  return [
    ...primaryKeyConstraintLines,
    ...uniqueConstraintLines,
    ...checkConstraintLines,
    ...foreignKeyConstraintLines,
  ];
}

export function generateAddPrimaryKeySql(
  schema: DatabaseSchema,
  table: DatabaseTable,
): string | null {
  const primaryKeyColumns = table.columns
    .filter((column) => column.primaryKey)
    .map((column) => column.name);

  if (primaryKeyColumns.length === 0) return null;

  return `ALTER TABLE ${schema.name}.${table.name} ADD CONSTRAINT pk_${table.name} PRIMARY KEY (${primaryKeyColumns.join(", ")});`;
}

export function generateAddUniqueConstraintSql(
  schema: DatabaseSchema,
  table: DatabaseTable,
  uniqueConstraint: DatabaseUniqueConstraint,
): string {
  if (uniqueConstraint.condition && uniqueConstraint.condition.trim() !== "") {
    const columns = uniqueConstraint.columns.join(", ");
    return `CREATE UNIQUE INDEX ${uniqueConstraint.name} ON ${schema.name}.${table.name} (${columns}) WHERE ${uniqueConstraint.condition};`;
  }
  return `ALTER TABLE ${schema.name}.${table.name} ADD ${generateUniqueConstraintSql(uniqueConstraint).trim()};`;
}

export function generateAddForeignKeySql(
  schema: DatabaseSchema,
  table: DatabaseTable,
  foreignKey: DatabaseForeignKey,
): string {
  return `ALTER TABLE ${schema.name}.${table.name} ADD ${generateForeignKeySql(foreignKey).trim()};`;
}

export function generateColumnTypeSql(column: DatabaseColumn): string {
  if (supportsScale(column.type)) {
    if (typeof column.size === "number" && typeof column.scale === "number") {
      return `${column.type}(${column.size},${column.scale})`;
    }

    return column.type;
  }

  if (supportsSize(column.type)) {
    if (typeof column.size === "number") {
      return `${column.type}(${column.size})`;
    }

    return column.type;
  }

  return column.type;
}

export function generateColumnSql(
  schema: DatabaseSchema,
  column: DatabaseColumn,
): string {
  const parts = [`    ${column.name} ${generateColumnTypeSql(column)}`];

  if (!column.nullable) {
    parts.push("NOT NULL");
  }

  if (column.sequenceName) {
    parts.push(
      `DEFAULT nextval('${schema.name}.${column.sequenceName}'::regclass)`,
    );
  } else if (column.defaultValue) {
    parts.push(`DEFAULT ${column.defaultValue}`);
  }

  return parts.join(" ");
}

export function generateForeignKeySql(foreignKey: DatabaseForeignKey): string {
  const sourceColumns = foreignKey.sourceColumns.join(", ");
  const targetColumns = foreignKey.targetColumns.join(", ");

  const parts = [
    `    CONSTRAINT ${foreignKey.name}`,
    `FOREIGN KEY (${sourceColumns})`,
    `REFERENCES ${foreignKey.targetSchema}.${foreignKey.targetTable} (${targetColumns})`,
  ];

  if (foreignKey.onUpdate) {
    parts.push(`ON UPDATE ${foreignKey.onUpdate}`);
  }

  if (foreignKey.onDelete) {
    parts.push(`ON DELETE ${foreignKey.onDelete}`);
  }

  return parts.join(" ");
}

export function generateUniqueConstraintSql(
  uniqueConstraint: DatabaseUniqueConstraint,
): string {
  const columns = uniqueConstraint.columns.join(", ");

  return `    CONSTRAINT ${uniqueConstraint.name} UNIQUE (${columns})`;
}

export function generateIndexSql(
  schema: DatabaseSchema,
  table: DatabaseTable,
  index: DatabaseIndex,
): string {
  const columns = index.columns.join(", ");

  return `CREATE INDEX IF NOT EXISTS ${index.name} ON ${schema.name}.${table.name} (${columns});`;
}

export function generateCheckConstraintSql(
  checkConstraint: CheckConstraint,
): string {
  return `    CONSTRAINT ${checkConstraint.name} CHECK (${checkConstraint.expression})`;
}

export function generateTriggerSql(
  schema: DatabaseSchema,
  table: DatabaseTable,
  trigger: DatabaseTrigger,
  project: DatabaseProject,
): string {
  const targetFn = (project.functions ?? []).find((f) => f.id === trigger.functionId);
  if (!targetFn) {
    throw new Error(`Trigger "${trigger.name}" references missing function id "${trigger.functionId}"`);
  }
  const fnSchema = project.schemas.find((s) => s.id === targetFn.schemaId);
  const fnSchemaName = fnSchema ? fnSchema.name : schema.name;

  const constraintPart = trigger.isConstraint ? "CONSTRAINT " : "";
  const eventsPart = trigger.events.join(" OR ");
  const forEachPart = `FOR EACH ${trigger.forEach}`;

  const conditionPart = trigger.condition ? `\n    WHEN (${trigger.condition})` : "";

  const deferrablePart = trigger.isConstraint
    ? `\n    ${trigger.deferrable ? "DEFERRABLE" : "NOT DEFERRABLE"}${
        trigger.initiallyDeferred ? " INITIALLY DEFERRED" : " INITIALLY IMMEDIATE"
      }`
    : "";

  return [
    `CREATE ${constraintPart}TRIGGER ${trigger.name}`,
    `    ${trigger.eventTiming} ${eventsPart}`,
    `    ON ${schema.name}.${table.name}${deferrablePart}`,
    `    ${forEachPart}${conditionPart}`,
    `    EXECUTE FUNCTION ${fnSchemaName}.${targetFn.name}();`,
  ].join("\n");
}

export function generateViewSql(
  schema: DatabaseSchema,
  view: DatabaseView,
): string {
  let definition = view.definition.trim();
  if (definition.endsWith(";")) {
    definition = definition.slice(0, -1).trim();
  }

  if (view.isMaterialized) {
    const noDataPart = view.withNoData ? " WITH NO DATA" : "";
    return `CREATE MATERIALIZED VIEW ${schema.name}.${view.name} AS\n${definition}${noDataPart};`;
  } else {
    return `CREATE OR REPLACE VIEW ${schema.name}.${view.name} AS\n${definition};`;
  }
}
