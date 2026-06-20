import type { DatabaseProject } from "./database-project";

export function createEmptyProject(): DatabaseProject {
    return {
        id: crypto.randomUUID(),
        name: "Untitled project",
        engine: "postgresql",
        schemas: [
            {
                id: crypto.randomUUID(),
                name: "public",
                sequences: [
                    {
                        id: crypto.randomUUID(),
                        name: "global_id_seq",
                        startWith: 1,
                        incrementBy: 1,
                    },
                ],
                tables: [
                    {
                        id: crypto.randomUUID(),
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
                                type: "varchar(200)",
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
                        id: crypto.randomUUID(),
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
                                type: "varchar(150)",
                                nullable: false,
                                primaryKey: false,
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
                    }
                ],
            },
        ],
    };
}