import type { DatabaseProject } from "./database-project";

export function createEmptyProject(): DatabaseProject {
    const publicSchemaId = crypto.randomUUID();

    const globalSequenceId = crypto.randomUUID();

    const usersTableId = crypto.randomUUID();
    const profilesTableId = crypto.randomUUID();
    const rolesTableId = crypto.randomUUID();

    return {
        id: crypto.randomUUID(),
        name: "Untitled project",
        engine: "postgresql",
        schemas: [
            {
                id: publicSchemaId,
                name: "public",
                sequences: [
                    {
                        id: globalSequenceId,
                        name: "global_id_seq",
                        startWith: 1,
                        incrementBy: 1,
                    },
                ],
                tables: [
                    {
                        id: usersTableId,
                        name: "tb_users",
                        columns: [
                            {
                                id: crypto.randomUUID(),
                                name: "id",
                                type: "bigint",
                                nullable: false,
                                primaryKey: true,
                                sequenceName: "global_id_seq",
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "email",
                                type: "varchar",
                                size: 200,
                                nullable: false,
                                primaryKey: false,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "created_at",
                                type: "timestamp",
                                nullable: false,
                                primaryKey: false,
                                defaultValue: "CURRENT_TIMESTAMP",
                            },
                        ],
                        foreignKeys: [],
                        uniqueConstraints: [],
                        indexes: [],
                    },
                    {
                        id: profilesTableId,
                        name: "tb_profiles",
                        columns: [
                            {
                                id: crypto.randomUUID(),
                                name: "id",
                                type: "bigint",
                                nullable: false,
                                primaryKey: true,
                                sequenceName: "global_id_seq",
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "user_id",
                                type: "bigint",
                                nullable: false,
                                primaryKey: false,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "display_name",
                                type: "varchar",
                                size: 150,
                                nullable: false,
                                primaryKey: false,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "created_at",
                                type: "timestamp",
                                nullable: false,
                                primaryKey: false,
                                defaultValue: "CURRENT_TIMESTAMP",
                            },
                        ],
                        foreignKeys: [
                            {
                                id: crypto.randomUUID(),
                                name: "fk_tb_profiles_user",
                                sourceColumns: ["user_id"],
                                targetSchema: "public",
                                targetTable: "tb_users",
                                targetColumns: ["id"],
                                onUpdate: "NO ACTION",
                                onDelete: "CASCADE",
                            },
                        ],
                        uniqueConstraints: [],
                        indexes: [],
                    },
                    {
                        id: rolesTableId,
                        name: "tb_roles",
                        columns: [
                            {
                                id: crypto.randomUUID(),
                                name: "id",
                                type: "bigint",
                                nullable: false,
                                primaryKey: true,
                                sequenceName: "global_id_seq",
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "user_id",
                                type: "bigint",
                                nullable: false,
                                primaryKey: false,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "display_name",
                                type: "varchar",
                                size: 150,
                                nullable: false,
                                primaryKey: false,
                            },
                            {
                                id: crypto.randomUUID(),
                                name: "created_at",
                                type: "timestamp",
                                nullable: false,
                                primaryKey: false,
                                defaultValue: "CURRENT_TIMESTAMP",
                            },
                        ],
                        foreignKeys: [
                            {
                                id: crypto.randomUUID(),
                                name: "fk_tb_roles_user",
                                sourceColumns: ["user_id"],
                                targetSchema: "public",
                                targetTable: "tb_users",
                                targetColumns: ["id"],
                                onUpdate: "NO ACTION",
                                onDelete: "CASCADE",
                            },
                        ],
                        uniqueConstraints: [],
                        indexes: [],
                    },
                ],
            },
        ],
        diagram: {
            tableNodes: [
                {
                    tableId: usersTableId,
                    position: {
                        x: 620,
                        y: 120,
                    },
                },
                {
                    tableId: profilesTableId,
                    position: {
                        x: 120,
                        y: 120,
                    },
                },
                {
                    tableId: rolesTableId,
                    position: {
                        x: 120,
                        y: 420,
                    },
                },
            ],
        },
    };
}