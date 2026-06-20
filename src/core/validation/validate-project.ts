import type { DatabaseProject } from "../model";
import { POSTGRES_RESERVED_WORDS } from "../sql/postgres-reserved-words";
import {
    isPostgresColumnType,
    supportsScale,
    supportsSize,
} from "../sql/postgres-column-types";

const FOREIGN_KEY_ACTIONS = ["NO ACTION", "CASCADE", "RESTRICT", "SET NULL"];

export function validateProject(project: unknown): DatabaseProject {
    if (!isObject(project)) {
        throw new Error("Invalid project file.");
    }

    if (project.engine !== "postgresql") {
        throw new Error("Only PostgreSQL projects are supported.");
    }

    validateRequiredString(project.name, "Project name");

    if (!Array.isArray(project.schemas)) {
        throw new Error("Project schemas are required.");
    }

    if (project.schemas.length === 0) {
        throw new Error("Project must have at least one schema.");
    }

    validateUniqueNames(project.schemas, "Project schemas", (schema) => schema.name);

    for (const schema of project.schemas) {
        validateSchema(schema, project.schemas);
    }

    validateDiagram(project);

    return project as unknown as DatabaseProject;
}

function validateSchema(schema: unknown, projectSchemas: unknown[]) {
    if (!isObject(schema)) {
        throw new Error("Invalid schema.");
    }

    validateRequiredString(schema.id, "Schema id");
    validateSqlIdentifier(schema.name, "Schema name");

    if (!Array.isArray(schema.sequences)) {
        throw new Error(`Schema "${schema.name}" sequences are required.`);
    }

    if (!Array.isArray(schema.tables)) {
        throw new Error(`Schema "${schema.name}" tables are required.`);
    }

    validateUniqueNames(
        schema.sequences,
        `Schema "${schema.name}" sequences`,
        (sequence) => sequence.name
    );

    validateUniqueNames(
        schema.tables,
        `Schema "${schema.name}" tables`,
        (table) => table.name
    );

    for (const sequence of schema.sequences) {
        validateSequence(sequence, schema.name);
    }

    for (const table of schema.tables) {
        validateTable(
            table,
            schema.name,
            schema.sequences,
            schema.tables,
            projectSchemas
        );
    }
}

function validateSequence(sequence: unknown, schemaName: unknown) {
    if (!isObject(sequence)) {
        throw new Error(`Invalid sequence in schema "${schemaName}".`);
    }

    validateRequiredString(sequence.id, `Sequence id in schema "${schemaName}"`);
    validateSqlIdentifier(
        sequence.name,
        `Sequence name in schema "${schemaName}"`
    );

    validateRequiredNumber(
        sequence.startWith,
        `Sequence "${sequence.name}" startWith`
    );

    validateRequiredNumber(
        sequence.incrementBy,
        `Sequence "${sequence.name}" incrementBy`
    );

    if (sequence.incrementBy === 0) {
        throw new Error(`Sequence "${sequence.name}" incrementBy cannot be zero.`);
    }
}

function validateTable(
    table: unknown,
    schemaName: unknown,
    schemaSequences: unknown[],
    schemaTables: unknown[],
    projectSchemas: unknown[]
) {
    if (!isObject(table)) {
        throw new Error(`Invalid table in schema "${schemaName}".`);
    }

    validateRequiredString(table.id, `Table id in schema "${schemaName}"`);
    validateSqlIdentifier(table.name, `Table name in schema "${schemaName}"`);

    if (!Array.isArray(table.columns)) {
        throw new Error(`Table "${table.name}" columns are required.`);
    }

    if (!Array.isArray(table.foreignKeys)) {
        throw new Error(`Table "${table.name}" foreignKeys are required.`);
    }

    if (!Array.isArray(table.uniqueConstraints)) {
        throw new Error(`Table "${table.name}" uniqueConstraints are required.`);
    }

    if (!Array.isArray(table.indexes)) {
        throw new Error(`Table "${table.name}" indexes are required.`);
    }

    validateUniqueNames(
        table.columns,
        `Table "${table.name}" columns`,
        (column) => column.name
    );

    validateUniqueNames(
        table.foreignKeys,
        `Table "${table.name}" foreign keys`,
        (foreignKey) => foreignKey.name
    );

    validateDuplicatedForeignKeyDefinitions(table.foreignKeys, table.name);

    validateUniqueNames(
        table.uniqueConstraints,
        `Table "${table.name}" unique constraints`,
        (uniqueConstraint) => uniqueConstraint.name
    );

    validateDuplicatedUniqueConstraintDefinitions(
        table.uniqueConstraints,
        table.name
    );

    validateUniqueNames(
        table.indexes,
        `Table "${table.name}" indexes`,
        (index) => index.name
    );

    validateDuplicatedIndexDefinitions(table.indexes, table.name);

    for (const column of table.columns) {
        validateColumn(column, table.name, schemaSequences);
    }

    for (const foreignKey of table.foreignKeys) {
        validateForeignKey(
            foreignKey,
            table,
            schemaTables,
            projectSchemas
        );
    }

    for (const uniqueConstraint of table.uniqueConstraints) {
        validateUniqueConstraint(uniqueConstraint, table);
    }

    for (const index of table.indexes) {
        validateIndex(index, table);
    }
}

function validateDuplicatedForeignKeyDefinitions(
    foreignKeys: unknown[],
    tableName: unknown
) {
    const definitions = new Set<string>();

    for (const foreignKey of foreignKeys) {
        if (!isObject(foreignKey)) {
            continue;
        }

        if (
            !Array.isArray(foreignKey.sourceColumns) ||
            typeof foreignKey.targetSchema !== "string" ||
            typeof foreignKey.targetTable !== "string" ||
            !Array.isArray(foreignKey.targetColumns)
        ) {
            continue;
        }

        const definitionKey = [
            foreignKey.sourceColumns.join(","),
            foreignKey.targetSchema,
            foreignKey.targetTable,
            foreignKey.targetColumns.join(","),
        ].join("|");

        if (definitions.has(definitionKey)) {
            throw new Error(
                `Table "${tableName}" has duplicated foreign key definition.`
            );
        }

        definitions.add(definitionKey);
    }
}

function validateUniqueConstraint(
    uniqueConstraint: unknown,
    table: Record<string, unknown>
) {
    if (!isObject(uniqueConstraint)) {
        throw new Error(`Invalid unique constraint in table "${table.name}".`);
    }

    validateRequiredString(
        uniqueConstraint.id,
        `Unique constraint id in table "${table.name}"`
    );

    validateSqlIdentifier(
        uniqueConstraint.name,
        `Unique constraint name in table "${table.name}"`
    );

    if (!Array.isArray(uniqueConstraint.columns)) {
        throw new Error(
            `Unique constraint "${uniqueConstraint.name}" columns are required.`
        );
    }

    if (uniqueConstraint.columns.length === 0) {
        throw new Error(
            `Unique constraint "${uniqueConstraint.name}" must have at least one column.`
        );
    }

    if (!Array.isArray(table.columns)) {
        throw new Error(`Table "${table.name}" columns are required.`);
    }

    for (const columnName of uniqueConstraint.columns) {
        validateSqlIdentifier(
            columnName,
            `Unique constraint "${uniqueConstraint.name}" column`
        );

        const columnExists = table.columns.some((column) => {
            return isObject(column) && column.name === columnName;
        });

        if (!columnExists) {
            throw new Error(
                `Unique constraint "${uniqueConstraint.name}" references missing column "${columnName}" in table "${table.name}".`
            );
        }
    }
}

function validateDuplicatedUniqueConstraintDefinitions(
    uniqueConstraints: unknown[],
    tableName: unknown
) {
    const definitions = new Set<string>();

    for (const uniqueConstraint of uniqueConstraints) {
        if (!isObject(uniqueConstraint)) {
            continue;
        }

        if (!Array.isArray(uniqueConstraint.columns)) {
            continue;
        }

        const definitionKey = uniqueConstraint.columns.join(",");

        if (definitions.has(definitionKey)) {
            throw new Error(
                `Table "${tableName}" has duplicated unique constraint definition.`
            );
        }

        definitions.add(definitionKey);
    }
}

function validateIndex(index: unknown, table: Record<string, unknown>) {
    if (!isObject(index)) {
        throw new Error(`Invalid index in table "${table.name}".`);
    }

    validateRequiredString(
        index.id,
        `Index id in table "${table.name}"`
    );

    validateSqlIdentifier(
        index.name,
        `Index name in table "${table.name}"`
    );

    if (!Array.isArray(index.columns)) {
        throw new Error(`Index "${index.name}" columns are required.`);
    }

    if (index.columns.length === 0) {
        throw new Error(
            `Index "${index.name}" must have at least one column.`
        );
    }

    if (!Array.isArray(table.columns)) {
        throw new Error(`Table "${table.name}" columns are required.`);
    }

    for (const columnName of index.columns) {
        validateSqlIdentifier(
            columnName,
            `Index "${index.name}" column`
        );

        const columnExists = table.columns.some((column) => {
            return isObject(column) && column.name === columnName;
        });

        if (!columnExists) {
            throw new Error(
                `Index "${index.name}" references missing column "${columnName}" in table "${table.name}".`
            );
        }
    }
}

function validateDuplicatedIndexDefinitions(
    indexes: unknown[],
    tableName: unknown
) {
    const definitions = new Set<string>();

    for (const index of indexes) {
        if (!isObject(index)) {
            continue;
        }

        if (!Array.isArray(index.columns)) {
            continue;
        }

        const definitionKey = index.columns.join(",");

        if (definitions.has(definitionKey)) {
            throw new Error(
                `Table "${tableName}" has duplicated index definition.`
            );
        }

        definitions.add(definitionKey);
    }
}

function validateColumn(
    column: unknown,
    tableName: unknown,
    schemaSequences: unknown[]
) {
    if (!isObject(column)) {
        throw new Error(`Invalid column in table "${tableName}".`);
    }

    validateRequiredString(column.id, `Column id in table "${tableName}"`);
    validateSqlIdentifier(column.name, `Column name in table "${tableName}"`);
    validateRequiredString(column.type, `Column type for column "${column.name}"`);

    if (!isPostgresColumnType(column.type)) {
        throw new Error(
            `Column "${column.name}" type "${column.type}" is not supported.`
        );
    }

    validateColumnSizeAndScale(column);

    if (typeof column.nullable !== "boolean") {
        throw new Error(`Column "${column.name}" nullable must be boolean.`);
    }

    if (typeof column.primaryKey !== "boolean") {
        throw new Error(`Column "${column.name}" primaryKey must be boolean.`);
    }

    if (
        column.defaultValue !== undefined &&
        typeof column.defaultValue !== "string"
    ) {
        throw new Error(`Column "${column.name}" defaultValue must be string.`);
    }

    if (
        typeof column.defaultValue === "string" &&
        (column.defaultValue.includes(";") ||
            column.defaultValue.includes("\n") ||
            column.defaultValue.includes("\r"))
    ) {
        throw new Error(
            `Column "${column.name}" defaultValue cannot contain semicolon or line breaks.`
        );
    }

    if (
        column.sequenceName !== undefined &&
        typeof column.sequenceName !== "string"
    ) {
        throw new Error(`Column "${column.name}" sequenceName must be string.`);
    }

    if (
        typeof column.sequenceName === "string" &&
        column.sequenceName.trim() !== "" &&
        typeof column.defaultValue === "string" &&
        column.defaultValue.trim() !== ""
    ) {
        throw new Error(
            `Column "${column.name}" cannot have both sequenceName and defaultValue.`
        );
    }

    if (
        typeof column.sequenceName === "string" &&
        column.sequenceName.trim() !== ""
    ) {
        const sequenceExists = schemaSequences.some((sequence) => {
            return isObject(sequence) && sequence.name === column.sequenceName;
        });

        if (!sequenceExists) {
            throw new Error(
                `Column "${column.name}" references missing sequence "${column.sequenceName}".`
            );
        }
    }
}

function validateColumnSizeAndScale(column: Record<string, unknown>) {
    const name = column.name as string;
    const type = column.type as string;

    if (supportsSize(type)) {
        if (typeof column.size !== "number") {
            throw new Error(`Column "${name}" type "${type}" requires size.`);
        }

        if (!Number.isInteger(column.size) || column.size <= 0) {
            throw new Error(`Column "${name}" size must be a positive integer.`);
        }
    } else if (column.size !== undefined) {
        throw new Error(`Column "${name}" type "${type}" does not support size.`);
    }

    if (supportsScale(type)) {
        if (typeof column.scale !== "number") {
            throw new Error(`Column "${name}" type "${type}" requires scale.`);
        }

        if (!Number.isInteger(column.scale) || column.scale < 0) {
            throw new Error(`Column "${name}" scale must be zero or a positive integer.`);
        }

        if (
            typeof column.size === "number" &&
            typeof column.scale === "number" &&
            column.scale > column.size
        ) {
            throw new Error(`Column "${name}" scale cannot be greater than size.`);
        }
    } else if (column.scale !== undefined) {
        throw new Error(`Column "${name}" type "${type}" does not support scale.`);
    }
}

function validateForeignKey(
    foreignKey: unknown,
    sourceTable: Record<string, unknown>,
    schemaTables: unknown[],
    projectSchemas: unknown[]
) {
    if (!isObject(foreignKey)) {
        throw new Error(`Invalid foreign key in table "${sourceTable.name}".`);
    }

    validateRequiredString(
        foreignKey.id,
        `Foreign key id in table "${sourceTable.name}"`
    );

    validateSqlIdentifier(
        foreignKey.name,
        `Foreign key name in table "${sourceTable.name}"`
    );

    if (!Array.isArray(foreignKey.sourceColumns)) {
        throw new Error(
            `Foreign key "${foreignKey.name}" sourceColumns are required.`
        );
    }

    if (foreignKey.sourceColumns.length === 0) {
        throw new Error(
            `Foreign key "${foreignKey.name}" must have at least one source column.`
        );
    }

    if (!Array.isArray(sourceTable.columns)) {
        throw new Error(`Table "${sourceTable.name}" columns are required.`);
    }

    for (const sourceColumn of foreignKey.sourceColumns) {
        validateSqlIdentifier(
            sourceColumn,
            `Foreign key "${foreignKey.name}" source column`
        );

        const sourceColumnExists = sourceTable.columns.some((column) => {
            return isObject(column) && column.name === sourceColumn;
        });

        if (!sourceColumnExists) {
            throw new Error(
                `Foreign key "${foreignKey.name}" references missing source column "${sourceColumn}" in table "${sourceTable.name}".`
            );
        }
    }

    validateSqlIdentifier(
        foreignKey.targetSchema,
        `Foreign key "${foreignKey.name}" targetSchema`
    );

    validateSqlIdentifier(
        foreignKey.targetTable,
        `Foreign key "${foreignKey.name}" targetTable`
    );

    if (!Array.isArray(foreignKey.targetColumns)) {
        throw new Error(
            `Foreign key "${foreignKey.name}" targetColumns are required.`
        );
    }

    if (foreignKey.targetColumns.length === 0) {
        throw new Error(
            `Foreign key "${foreignKey.name}" must have at least one target column.`
        );
    }

    if (foreignKey.sourceColumns.length !== foreignKey.targetColumns.length) {
        throw new Error(
            `Foreign key "${foreignKey.name}" must have the same number of source and target columns.`
        );
    }

    const targetSchema = projectSchemas.find((schema) => {
        return isObject(schema) && schema.name === foreignKey.targetSchema;
    });

    if (!isObject(targetSchema)) {
        throw new Error(
            `Foreign key "${foreignKey.name}" references missing target schema "${foreignKey.targetSchema}".`
        );
    }

    if (!Array.isArray(targetSchema.tables)) {
        throw new Error(
            `Target schema "${foreignKey.targetSchema}" tables are required.`
        );
    }

    const targetTable = targetSchema.tables.find((table) => {
        return isObject(table) && table.name === foreignKey.targetTable;
    });

    if (!isObject(targetTable)) {
        throw new Error(
            `Foreign key "${foreignKey.name}" references missing target table "${foreignKey.targetSchema}.${foreignKey.targetTable}".`
        );
    }

    if (!Array.isArray(targetTable.columns)) {
        throw new Error(
            `Target table "${foreignKey.targetSchema}.${foreignKey.targetTable}" columns are required.`
        );
    }

    for (const targetColumn of foreignKey.targetColumns) {
        validateSqlIdentifier(
            targetColumn,
            `Foreign key "${foreignKey.name}" target column`
        );

        const targetColumnExists = targetTable.columns.some((column) => {
            return isObject(column) && column.name === targetColumn;
        });

        if (!targetColumnExists) {
            throw new Error(
                `Foreign key "${foreignKey.name}" references missing target column "${targetColumn}" in table "${foreignKey.targetSchema}.${foreignKey.targetTable}".`
            );
        }
    }

    validateOptionalForeignKeyAction(
        foreignKey.onUpdate,
        `Foreign key "${foreignKey.name}" onUpdate`
    );

    validateOptionalForeignKeyAction(
        foreignKey.onDelete,
        `Foreign key "${foreignKey.name}" onDelete`
    );

    validateTargetTableIsPartOfKnownSchemas(
        foreignKey,
        schemaTables,
        targetTable
    );
}

function validateTargetTableIsPartOfKnownSchemas(
    foreignKey: Record<string, unknown>,
    schemaTables: unknown[],
    targetTable: Record<string, unknown>
) {
    const isSelfSchemaTable = schemaTables.some((table) => {
        return isObject(table) && table.name === foreignKey.targetTable;
    });

    if (isSelfSchemaTable) {
        return;
    }

    if (!targetTable.name) {
        throw new Error(
            `Foreign key "${foreignKey.name}" references invalid target table.`
        );
    }
}

function validateDiagram(project: Record<string, unknown>) {
    const diagram = project.diagram;

    if (!isObject(diagram)) {
        throw new Error("Project diagram is required.");
    }

    const tableNodes = diagram.tableNodes;

    if (!Array.isArray(tableNodes)) {
        throw new Error("Project diagram tableNodes must be an array.");
    }

    const schemas = project.schemas as Array<{
        tables: Array<{
            id: string;
        }>;
    }>;

    const tableIds = new Set<string>();

    for (const schema of schemas) {
        for (const table of schema.tables) {
            tableIds.add(table.id);
        }
    }

    const diagramTableIds = new Set<string>();

    for (const tableNode of tableNodes) {
        if (!isObject(tableNode)) {
            throw new Error("Project diagram table node must be an object.");
        }

        validateRequiredString(tableNode.tableId, "Diagram table node tableId");

        const tableId = tableNode.tableId as string;

        if (!tableIds.has(tableId)) {
            throw new Error(
                `Diagram table node references unknown table id "${tableId}".`
            );
        }

        if (diagramTableIds.has(tableId)) {
            throw new Error(
                `Diagram table node for table id "${tableId}" is duplicated.`
            );
        }

        diagramTableIds.add(tableId);

        const position = tableNode.position;

        if (!isObject(position)) {
            throw new Error(
                `Diagram table node "${tableId}" position is required.`
            );
        }

        if (typeof position.x !== "number") {
            throw new Error(
                `Diagram table node "${tableId}" position x must be a number.`
            );
        }

        if (typeof position.y !== "number") {
            throw new Error(
                `Diagram table node "${tableId}" position y must be a number.`
            );
        }
    }
}

function validateRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== "string") {
        throw new Error(`${fieldName} is required.`);
    }

    if (value.trim() === "") {
        throw new Error(`${fieldName} cannot be empty.`);
    }
}

function validateRequiredNumber(value: unknown, fieldName: string) {
    if (typeof value !== "number") {
        throw new Error(`${fieldName} is required.`);
    }

    if (!Number.isFinite(value)) {
        throw new Error(`${fieldName} must be a valid number.`);
    }
}

function validateOptionalForeignKeyAction(value: unknown, fieldName: string) {
    if (value === undefined) {
        return;
    }

    if (typeof value !== "string" || !FOREIGN_KEY_ACTIONS.includes(value)) {
        throw new Error(
            `${fieldName} must be one of: ${FOREIGN_KEY_ACTIONS.join(", ")}.`
        );
    }
}

function validateUniqueNames(
    items: unknown[],
    contextName: string,
    getName: (item: Record<string, unknown>) => unknown
) {
    const names = new Set<string>();

    for (const item of items) {
        if (!isObject(item)) {
            continue;
        }

        const name = getName(item);

        if (typeof name !== "string") {
            continue;
        }

        const normalizedName = name.trim();

        if (normalizedName === "") {
            continue;
        }

        if (names.has(normalizedName)) {
            throw new Error(`${contextName} has duplicated name "${normalizedName}".`);
        }

        names.add(normalizedName);
    }
}

function validateSqlIdentifier(value: unknown, fieldName: string) {
    validateRequiredString(value, fieldName);

    const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

    const str = value as string;

    if (!identifierPattern.test(str)) {
        throw new Error(
            `${fieldName} must start with a letter or underscore and contain only letters, numbers, and underscores.`
        );
    }

    if (POSTGRES_RESERVED_WORDS.has(str.toLowerCase())) {
        throw new Error(`${fieldName} cannot be a PostgreSQL reserved word.`);
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}