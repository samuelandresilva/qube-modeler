import { describe, it, expect } from "vitest";
import { diffProjects } from "./project-diff";
import { createProjectFixture, createSchemaFixture, createTableFixture, createColumnFixture } from "../test-utils/project-fixtures";

describe("project-diff", () => {
  it("detects creating a new table", () => {
    const before = createProjectFixture({
      schemas: [createSchemaFixture({ id: "s1", name: "public" })]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          name: "public",
          tables: [createTableFixture({ id: "t1", name: "users" })]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "CREATE_TABLE",
        schemaId: "s1",
        tableId: "t1",
        tableName: "users",
      })
    );
  });

  it("detects creating a new column", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [createTableFixture({ id: "t1", columns: [] })]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", name: "id" })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ADD_COLUMN",
        tableId: "t1",
        columnId: "c1",
      })
    );
  });

  it("detects dropping a column and marks it as destructive", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", name: "id" })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [createTableFixture({ id: "t1", columns: [] })]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "DROP_COLUMN",
        tableId: "t1",
        columnId: "c1",
        risk: "destructive"
      })
    );
  });

  it("detects renaming a table (same ID, new name)", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [createTableFixture({ id: "t1", name: "users" })]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [createTableFixture({ id: "t1", name: "accounts" })]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "RENAME_TABLE",
        tableId: "t1",
        oldName: "users",
        newName: "accounts"
      })
    );
    expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "DROP_TABLE" }));
    expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "CREATE_TABLE" }));
  });

  it("detects renaming a column", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", name: "old_name" })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", name: "new_name" })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "RENAME_COLUMN",
        columnId: "c1",
        oldName: "old_name",
        newName: "new_name"
      })
    );
    expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "DROP_COLUMN" }));
    expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "ADD_COLUMN" }));
  });

  it("detects altering column type", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "varchar" })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "text" })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_COLUMN_TYPE",
        columnId: "c1",
        oldType: "varchar",
        newType: "text"
      })
    );
  });

  it("detects altering column size (varchar expansion)", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "varchar", size: 100 })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "varchar", size: 200 })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_COLUMN_SIZE",
        columnId: "c1",
        oldSize: 100,
        newSize: 200
      })
    );
  });

  it("detects altering column scale", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "numeric", size: 10, scale: 2 })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", type: "numeric", size: 10, scale: 4 })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_COLUMN_SIZE",
        columnId: "c1",
        oldScale: 2,
        newScale: 4
      })
    );
  });

  it("detects altering nullability", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", nullable: true })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", nullable: false })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    const op = diff.operations.find(o => o.kind === "ALTER_COLUMN_NULLABILITY");
    expect(op).toBeDefined();
    expect(op).toMatchObject({
      columnId: "c1",
      oldNullable: true,
      newNullable: false,
      risk: "warning" // true -> false is a warning usually
    });
  });

  it("detects altering manual default", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", defaultValue: "0" })]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [createColumnFixture({ id: "c1", defaultValue: "1" })]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_COLUMN_DEFAULT",
        columnId: "c1",
        oldDefault: "0",
        newDefault: "1"
      })
    );
  });

  it("detects altering primary key composition", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [
                createColumnFixture({ id: "c1", primaryKey: true }),
                createColumnFixture({ id: "c2", primaryKey: false })
              ]
            })
          ]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          tables: [
            createTableFixture({
              id: "t1",
              columns: [
                createColumnFixture({ id: "c1", primaryKey: true }),
                createColumnFixture({ id: "c2", primaryKey: true })
              ]
            })
          ]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_PRIMARY_KEY",
        tableId: "t1",
      })
    );
  });
  
  it("detects sequence parameters change", () => {
    const before = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          sequences: [{ id: "seq1", name: "my_seq", startWith: 1, incrementBy: 1 }]
        })
      ]
    });
    const after = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          sequences: [{ id: "seq1", name: "my_seq", startWith: 10, incrementBy: 2 }]
        })
      ]
    });

    const diff = diffProjects(before, after);
    expect(diff.operations).toContainEqual(
      expect.objectContaining({
        kind: "ALTER_SEQUENCE",
        sequenceId: "seq1",
        oldStartWith: 1,
        newStartWith: 10,
        oldIncrementBy: 1,
        newIncrementBy: 2
      })
    );
  });

  describe("schema alteration (ALTER_TABLE_SCHEMA)", () => {
    it("detects change of table schema by table id", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [createTableFixture({ id: "t1", name: "users" })]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: []
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [createTableFixture({ id: "t1", name: "users" })]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_TABLE_SCHEMA",
          risk: "warning",
          tableId: "t1",
          tableName: "users",
          oldSchemaName: "public",
          newSchemaName: "auth"
        })
      );
      expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "DROP_TABLE" }));
      expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "CREATE_TABLE" }));
      expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "RENAME_TABLE" }));
    });

    it("detects change of table schema and table rename simultaneously", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [createTableFixture({ id: "t1", name: "users" })]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: []
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [createTableFixture({ id: "t1", name: "app_users" })]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_TABLE_SCHEMA",
          tableId: "t1",
          oldSchemaName: "public",
          newSchemaName: "auth"
        })
      );
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "RENAME_TABLE",
          tableId: "t1",
          oldName: "users",
          newName: "app_users"
        })
      );
      expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "DROP_TABLE" }));
      expect(diff.operations).not.toContainEqual(expect.objectContaining({ kind: "CREATE_TABLE" }));
    });

    it("detects change of table schema and new column addition simultaneously", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [createTableFixture({ id: "t1", name: "users", columns: [createColumnFixture({ id: "c1", name: "id" })] })]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: []
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t1",
                name: "users",
                columns: [
                  createColumnFixture({ id: "c1", name: "id" }),
                  createColumnFixture({ id: "c2", name: "email" })
                ]
              })
            ]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_TABLE_SCHEMA",
          tableId: "t1",
          oldSchemaName: "public",
          newSchemaName: "auth"
        })
      );
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ADD_COLUMN",
          tableId: "t1",
          columnId: "c2",
          columnName: "email"
        })
      );
    });

    it("does not generate false ALTER_FOREIGN_KEY when referencing table schema shifts", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_users",
                name: "users",
                columns: [createColumnFixture({ id: "col_u_id", name: "id" })]
              }),
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "public",
                    targetTable: "users",
                    targetColumns: ["id"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "auth",
                    targetTable: "users",
                    targetColumns: ["id"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t_users",
                name: "users",
                columns: [createColumnFixture({ id: "col_u_id", name: "id" })]
              })
            ]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_TABLE_SCHEMA",
          tableId: "t_users",
          oldSchemaName: "public",
          newSchemaName: "auth"
        })
      );
      expect(diff.operations).not.toContainEqual(
        expect.objectContaining({
          kind: "ALTER_FOREIGN_KEY"
        })
      );
    });

    it("generates ALTER_FOREIGN_KEY if target table ID actually changes", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_users_old",
                name: "users",
                columns: [createColumnFixture({ id: "col_u_id", name: "id" })]
              }),
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "public",
                    targetTable: "users",
                    targetColumns: ["id"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "auth",
                    targetTable: "accounts",
                    targetColumns: ["id"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t_accounts",
                name: "accounts",
                columns: [createColumnFixture({ id: "col_a_id", name: "id" })]
              })
            ]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_FOREIGN_KEY",
          foreignKeyId: "fk1"
        })
      );
    });

    it("generates ALTER_FOREIGN_KEY if same logical table is moved but targetColumns changed", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_users",
                name: "users",
                columns: [createColumnFixture({ id: "col_u_id", name: "id" })]
              }),
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "public",
                    targetTable: "users",
                    targetColumns: ["id"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: []
          })
        ]
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t_posts",
                name: "posts",
                foreignKeys: [
                  {
                    id: "fk1",
                    name: "fk_posts_user",
                    sourceColumns: ["user_id"],
                    targetSchema: "auth",
                    targetTable: "users",
                    targetColumns: ["uuid"]
                  }
                ]
              })
            ]
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t_users",
                name: "users",
                columns: [createColumnFixture({ id: "col_u_id", name: "uuid" })]
              })
            ]
          })
        ]
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_TABLE_SCHEMA",
          tableId: "t_users",
          oldSchemaName: "public",
          newSchemaName: "auth"
        })
      );
      expect(diff.operations).toContainEqual(
        expect.objectContaining({
          kind: "ALTER_FOREIGN_KEY",
          foreignKeyId: "fk1"
        })
      );
    });
  });
});
