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
} from "@/core/model";
import { supportsScale, supportsSize } from "./postgres-column-types";

export function generatePostgresSql(project: DatabaseProject): string {
  const schemaDefinitions = project.schemas
    .map((schema) => `CREATE SCHEMA IF NOT EXISTS ${schema.name};`)
    .join("\n");

  const schemaObjects = project.schemas
    .map((schema) => generateSchemaObjectsSql(schema))
    .filter(Boolean)
    .join("\n\n");

  return [schemaDefinitions, schemaObjects].filter(Boolean).join("\n\n");
}

function generateSchemaObjectsSql(schema: DatabaseSchema): string {
  const sequenceSql = schema.sequences.map((sequence) =>
    generateSequenceSql(schema, sequence),
  );

  const tableSql = schema.tables.map((table) =>
    generateTableSql(schema, table, { includeConstraints: false }),
  );

  const tablePostCreateSql = schema.tables.flatMap((table) =>
    generateTablePostCreateSql(schema, table),
  );

  const indexSql = schema.tables.flatMap((table) =>
    table.indexes.map((index) => generateIndexSql(schema, table, index)),
  );

  return [
    ...sequenceSql,
    ...tableSql,
    ...tablePostCreateSql,
    ...indexSql,
  ].join("\n\n");
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

  const uniqueConstraintLines = table.uniqueConstraints.map(
    generateUniqueConstraintSql,
  );

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
