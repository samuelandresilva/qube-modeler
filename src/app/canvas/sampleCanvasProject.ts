import type { DatabaseProject } from "../../core/model";

export const sampleCanvasProject: DatabaseProject = {
    id: "sample-project",
    name: "Sample Project",
    engine: "postgresql",
    schemas: [
        {
            id: "public-schema",
            name: "public",
            sequences: [],
            tables: [
                {
                    id: "tb_users",
                    name: "tb_users",
                    columns: [
                        {
                            id: "tb_users_id",
                            name: "id",
                            type: "bigint",
                            nullable: false,
                            primaryKey: true,
                        },
                        {
                            id: "tb_users_name",
                            name: "name",
                            type: "varchar",
                            size: 255,
                            nullable: false,
                            primaryKey: false,
                        },
                        {
                            id: "tb_users_email",
                            name: "email",
                            type: "varchar",
                            size: 255,
                            nullable: false,
                            primaryKey: false,
                        },
                        {
                            id: "tb_users_created_at",
                            name: "created_at",
                            type: "timestamp",
                            nullable: false,
                            primaryKey: false,
                        },
                    ],
                    foreignKeys: [],
                    uniqueConstraints: [],
                    indexes: [],
                },
                {
                    id: "tb_profiles",
                    name: "tb_profiles",
                    columns: [
                        {
                            id: "tb_profiles_id",
                            name: "id",
                            type: "bigint",
                            nullable: false,
                            primaryKey: true,
                        },
                        {
                            id: "tb_profiles_user_id",
                            name: "user_id",
                            type: "bigint",
                            nullable: false,
                            primaryKey: false,
                        },
                        {
                            id: "tb_profiles_display_name",
                            name: "display_name",
                            type: "varchar",
                            size: 255,
                            nullable: false,
                            primaryKey: false,
                        },
                    ],
                    foreignKeys: [
                        {
                            id: "fk_tb_profiles_user_id",
                            name: "fk_tb_profiles_user_id",
                            sourceColumns: ["user_id"],
                            targetSchema: "public",
                            targetTable: "tb_users",
                            targetColumns: ["id"],
                            onUpdate: "NO ACTION",
                            onDelete: "NO ACTION",
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
                tableId: "tb_users",
                position: { x: 120, y: 120 },
            },
            {
                tableId: "tb_profiles",
                position: { x: 560, y: 160 },
            },
        ],
    },
};