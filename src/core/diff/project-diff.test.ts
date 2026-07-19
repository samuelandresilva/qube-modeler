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

  describe("CHECK constraints diff detection", () => {
    it("1. Detecta ADD_CHECK_CONSTRAINT", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age" })],
                checkConstraints: [],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ADD_CHECK_CONSTRAINT",
        risk: "warning",
        schemaId: expect.any(String),
        schemaName: "public",
        tableId: "table-1",
        tableName: "tb_users",
        constraintId: "chk-1",
        constraintName: "chk_tb_users_age",
        expression: "age BETWEEN 0 AND 120",
        columnIds: ["col-age"],
      });
    });

    it("2. Detecta DROP_CHECK_CONSTRAINT", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "DROP_CHECK_CONSTRAINT",
        risk: "destructive",
        schemaId: expect.any(String),
        schemaName: "public",
        tableId: "table-1",
        tableName: "tb_users",
        constraintId: "chk-1",
        constraintName: "chk_tb_users_age",
        expression: "age BETWEEN 0 AND 120",
        columnIds: ["col-age"],
      });
    });

    it("3. Detecta ALTER_CHECK_CONSTRAINT quando expression muda", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 18 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ALTER_CHECK_CONSTRAINT",
        risk: "warning",
        schemaId: expect.any(String),
        schemaName: "public",
        tableId: "table-1",
        tableName: "tb_users",
        oldSchemaName: "public",
        oldTableName: "tb_users",
        constraintId: "chk-1",
        oldConstraintName: "chk_tb_users_age",
        newConstraintName: "chk_tb_users_age",
        oldExpression: "age BETWEEN 0 AND 120",
        newExpression: "age BETWEEN 18 AND 120",
        oldColumnIds: undefined,
        newColumnIds: undefined,
      });
    });

    it("4. Detecta ALTER_CHECK_CONSTRAINT quando name muda", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age_range",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ALTER_CHECK_CONSTRAINT",
        risk: "warning",
        schemaId: expect.any(String),
        schemaName: "public",
        tableId: "table-1",
        tableName: "tb_users",
        oldSchemaName: "public",
        oldTableName: "tb_users",
        constraintId: "chk-1",
        oldConstraintName: "chk_tb_users_age",
        newConstraintName: "chk_tb_users_age_range",
        oldExpression: "age BETWEEN 0 AND 120",
        newExpression: "age BETWEEN 0 AND 120",
        oldColumnIds: undefined,
        newColumnIds: undefined,
      });
    });

    it("5. Detecta ALTER_CHECK_CONSTRAINT quando columnIds muda", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age", "col-status"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ALTER_CHECK_CONSTRAINT",
        risk: "warning",
        schemaId: expect.any(String),
        schemaName: "public",
        tableId: "table-1",
        tableName: "tb_users",
        oldSchemaName: "public",
        oldTableName: "tb_users",
        constraintId: "chk-1",
        oldConstraintName: "chk_tb_users_age",
        newConstraintName: "chk_tb_users_age",
        oldExpression: "age BETWEEN 0 AND 120",
        newExpression: "age BETWEEN 0 AND 120",
        oldColumnIds: ["col-age"],
        newColumnIds: ["col-age", "col-status"],
      });
    });

    it("6. Não gera alteração de CHECK quando tabela muda de schema", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [],
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0].kind).toBe("ALTER_TABLE_SCHEMA");
    });

    it("7. Não gera alteração de CHECK quando tabela muda de schema e nome, mas CHECK permanece igual", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [],
          }),
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_app_users",
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(2);
      const kinds = diff.operations.map(op => op.kind).sort();
      expect(kinds).toEqual(["ALTER_TABLE_SCHEMA", "RENAME_TABLE"]);
    });

    it("8. ADD_COLUMN + ADD_CHECK_CONSTRAINT no mesmo diff", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [],
                checkConstraints: [],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(2);
      
      const addColumn = diff.operations.find(op => op.kind === "ADD_COLUMN");
      const addCheck = diff.operations.find(op => op.kind === "ADD_CHECK_CONSTRAINT");

      expect(addColumn).toBeDefined();
      expect(addCheck).toBeDefined();
      expect(addCheck).toEqual(expect.objectContaining({
        tableId: "table-1",
        columnIds: ["col-age"],
      }));
    });

    it("9. DROP_CHECK_CONSTRAINT + DROP_COLUMN no mesmo diff", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [],
                checkConstraints: [],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(2);

      const dropColumn = diff.operations.find(op => op.kind === "DROP_COLUMN");
      const dropCheck = diff.operations.find(op => op.kind === "DROP_CHECK_CONSTRAINT");

      expect(dropColumn).toBeDefined();
      expect(dropCheck).toBeDefined();
      expect(dropCheck).toEqual(expect.objectContaining({
        tableId: "table-1",
        columnIds: ["col-age"],
      }));
    });

    it("10. ALTER_CHECK_CONSTRAINT + ALTER_COLUMN_TYPE no mesmo diff", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age", type: "integer" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age", type: "bigint" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 18 AND 120",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(2);

      const alterCol = diff.operations.find(op => op.kind === "ALTER_COLUMN_TYPE");
      const alterCheck = diff.operations.find(op => op.kind === "ALTER_CHECK_CONSTRAINT");

      expect(alterCol).toBeDefined();
      expect(alterCheck).toBeDefined();
    });
  });

  describe("Database Functions diffing", () => {
    it("1. Detecta ADD_FUNCTION", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ADD_FUNCTION",
        risk: "warning",
        functionId: "fn-1",
        schemaId: "schema-1",
        schemaName: "public",
        functionName: "fn_update_timestamp",
        language: "plpgsql",
        returnType: "trigger",
        arguments: [],
        body: "BEGIN RETURN NEW; END;",
      });
    });

    it("2. Detecta DROP_FUNCTION", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "DROP_FUNCTION",
        risk: "destructive",
        functionId: "fn-1",
        schemaId: "schema-1",
        schemaName: "public",
        functionName: "fn_update_timestamp",
        arguments: [],
      });
    });

    it("3. Detecta ALTER_FUNCTION por mudança de body", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: "RETURN NEW;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: "NEW.updated_at = now(); RETURN NEW;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          risk: "warning",
          functionId: "fn-1",
          oldBody: "RETURN NEW;",
          newBody: "NEW.updated_at = now(); RETURN NEW;",
          requiresDropAndRecreate: false,
        })
      );
    });

    it("4. Detecta ALTER_FUNCTION por mudança de language", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "plpgsql" as const,
            returnType: "integer",
            arguments: [],
            body: "RETURN 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "RETURN 1;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          oldLanguage: "plpgsql",
          newLanguage: "sql",
          requiresDropAndRecreate: false,
        })
      );
    });

    it("5. Detecta ALTER_FUNCTION por mudança de returnType", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "sql" as const,
            returnType: "bigint",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          oldReturnType: "integer",
          newReturnType: "bigint",
          requiresDropAndRecreate: false,
        })
      );
    });

    it("6. Detecta ALTER_FUNCTION por mudança de name", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_old",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_new",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          oldFunctionName: "fn_old",
          newFunctionName: "fn_new",
          requiresDropAndRecreate: true,
        })
      );
    });

    it("7. Detecta ALTER_FUNCTION por mudança de schemaId real", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({ id: "schema-public", name: "public" }),
          createSchemaFixture({ id: "schema-auth", name: "auth" }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-public",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({ id: "schema-public", name: "public" }),
          createSchemaFixture({ id: "schema-auth", name: "auth" }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-auth",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          oldSchemaName: "public",
          newSchemaName: "auth",
          requiresDropAndRecreate: true,
        })
      );
    });

    it("8. Detecta ALTER_FUNCTION por mudança de arguments", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_sum",
            language: "sql" as const,
            returnType: "numeric",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
            ],
            body: "SELECT a + b;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_sum",
            language: "sql" as const,
            returnType: "numeric",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
              { id: "a3", name: "c", dataType: "numeric" },
            ],
            body: "SELECT a + b + c;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_FUNCTION",
          requiresDropAndRecreate: true,
        })
      );
    });

    it("9. Não gera ALTER_FUNCTION quando apenas o schema foi renomeado", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_x",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "auth" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_x",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      // Deve conter RENAME_SCHEMA
      const renameSchemaOp = diff.operations.find(op => op.kind === "RENAME_SCHEMA");
      expect(renameSchemaOp).toBeDefined();

      // Não deve conter ALTER_FUNCTION
      const alterFuncOp = diff.operations.find(op => op.kind === "ALTER_FUNCTION");
      expect(alterFuncOp).toBeUndefined();
    });

    it("10. Preserva oldArguments para futuro DROP", () => {
      const argsList = [
        { id: "a1", name: "a", dataType: "numeric" },
        { id: "a2", name: "b", dataType: "numeric" },
      ];
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_sum",
            language: "sql" as const,
            returnType: "numeric",
            arguments: argsList,
            body: "SELECT a + b;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "DROP_FUNCTION",
          arguments: argsList,
        })
      );
    });

    it("11. ADD_FUNCTION com argumentos mode IN/OUT/INOUT", () => {
      const argsList = [
        { id: "a1", name: "amount", dataType: "numeric", mode: "IN" as const },
        { id: "a2", name: "result", dataType: "numeric", mode: "OUT" as const },
      ];
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "sql" as const,
            returnType: "numeric",
            arguments: argsList,
            body: "--",
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ADD_FUNCTION",
          arguments: argsList,
        })
      );
    });

    it("12. Alteração apenas de espaços nas extremidades do body", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "test_fn",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "   SELECT 1;   \n",
          },
        ],
      });

      const diff = diffProjects(before, after);
      // Não deve gerar ALTER_FUNCTION pois usamos trim()
      expect(diff.operations).toHaveLength(0);
    });
  });

  describe("PostgreSQL Triggers diffing", () => {
    it("1. Detecta ADD_TRIGGER ao criar um gatilho em uma tabela existente", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [],
              }),
            ],
          }),
        ],
      });
      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ADD_TRIGGER",
          triggerId: "trg-1",
          triggerName: "trg_test",
          eventTiming: "BEFORE",
          events: ["INSERT"],
          functionId: "fn-1",
          forEach: "ROW",
        })
      );
    });

    it("2. Detecta DROP_TRIGGER ao remover um gatilho", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "DROP_TRIGGER",
          triggerId: "trg-1",
          triggerName: "trg_test",
        })
      );
    });

    it("3. Detecta ALTER_TRIGGER com requiresDropAndRecreate = true se o timing ou evento mudar", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "AFTER",
                    events: ["INSERT", "UPDATE"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_TRIGGER",
          triggerId: "trg-1",
          oldTriggerName: "trg_test",
          newTriggerName: "trg_test",
          eventTiming: "AFTER",
          events: ["INSERT", "UPDATE"],
          requiresDropAndRecreate: true,
        })
      );
    });

    it("4. Cenário de Cascata: Se a função muda de assinatura (rebuild), emite DROP e ADD do trigger dependente", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [
              { id: "a1", name: "dummy", dataType: "integer" }
            ],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const diff = diffProjects(before, after);
      // Deve conter ALTER_FUNCTION (que exige rebuild)
      const alterFunc = diff.operations.find(op => op.kind === "ALTER_FUNCTION");
      expect(alterFunc).toBeDefined();
      if (alterFunc && alterFunc.kind === "ALTER_FUNCTION") {
        expect(alterFunc.requiresDropAndRecreate).toBe(true);
      }

      // Deve forçar o DROP_TRIGGER e ADD_TRIGGER do trigger dependente "trg-1"
      const dropTrg = diff.operations.find(op => op.kind === "DROP_TRIGGER" && op.triggerId === "trg-1");
      const addTrg = diff.operations.find(op => op.kind === "ADD_TRIGGER" && op.triggerId === "trg-1");

      expect(dropTrg).toBeDefined();
      expect(addTrg).toBeDefined();
    });

    it("6. Nao gera DROP_TRIGGER ou ALTER_TRIGGER se a tabela correspondente for excluida (DROP_TABLE)", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [],
          }),
        ],
      });

      const diff = diffProjects(before, after);
      // Deve conter DROP_TABLE
      const dropTable = diff.operations.find(op => op.kind === "DROP_TABLE" && op.tableId === "table-1");
      expect(dropTable).toBeDefined();

      // Nao deve conter DROP_TRIGGER ou ALTER_TRIGGER para a tabela table-1
      const triggerOps = diff.operations.filter(
        op => (op.kind === "DROP_TRIGGER" || op.kind === "ALTER_TRIGGER") && op.tableId === "table-1"
      );
      expect(triggerOps).toHaveLength(0);
    });
  });

  describe("PostgreSQL Views diff", () => {
    it("1. Detecta ADD_VIEW ao criar uma visao nova", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users",
            isMaterialized: false,
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "ADD_VIEW",
        risk: "warning",
        schemaId: "schema-1",
        schemaName: "public",
        viewId: "view-1",
        viewName: "v_active_users",
        definition: "SELECT * FROM users",
        isMaterialized: false,
        withNoData: undefined,
      });
    });

    it("2. Detecta DROP_VIEW ao remover uma visao existente", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users",
            isMaterialized: false,
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual({
        kind: "DROP_VIEW",
        risk: "destructive",
        schemaId: "schema-1",
        schemaName: "public",
        viewId: "view-1",
        viewName: "v_active_users",
        isMaterialized: false,
      });
    });

    it("3. Detecta ALTER_VIEW com requiresDropAndRecreate = true ao alterar a definicao (definition)", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users",
            isMaterialized: false,
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users WHERE active = true",
            isMaterialized: false,
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_VIEW",
          risk: "destructive",
          viewId: "view-1",
          requiresDropAndRecreate: true,
        })
      );
    });

    it("4. Detecta ALTER_VIEW com requiresDropAndRecreate = true ao alternar isMaterialized", () => {
      const before = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users",
            isMaterialized: false,
          },
        ],
      });
      const after = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM users",
            isMaterialized: true,
            withNoData: true,
          },
        ],
      });

      const diff = diffProjects(before, after);
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "ALTER_VIEW",
          risk: "destructive",
          viewId: "view-1",
          requiresDropAndRecreate: true,
        })
      );
    });

    it("5. Resolve cascade dependencies ao deletar tabela física com view dependente", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "users",
                columns: [
                  createColumnFixture({
                    id: "col-1",
                    name: "id",
                    type: "integer",
                    nullable: false,
                  }),
                ],
              }),
            ],
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM public.users",
            isMaterialized: false,
          },
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [],
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: "SELECT * FROM public.users WHERE active = true",
            isMaterialized: false,
          },
        ],
      });

      const diff = diffProjects(before, after);

      expect(diff.operations).toHaveLength(2);
      expect(diff.operations[0]).toEqual(
        expect.objectContaining({
          kind: "DROP_VIEW",
          viewName: "v_active_users",
          cascade: true,
        })
      );
      expect(diff.operations[1]).toEqual(
        expect.objectContaining({
          kind: "DROP_TABLE",
          tableName: "users",
        })
      );
    });

    it("view dependencies ignore mentions in comments and strings", () => {
      const before = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-users",
                name: "users",
              }),
              createTableFixture({
                id: "table-roles",
                name: "roles",
              }),
            ],
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: `
              SELECT * FROM public.roles
              -- Dependency on users table? No, this is a comment referring to public.users
              /* Or maybe a multi-line comment referencing users */
              WHERE name = 'users'
            `,
            isMaterialized: false,
          },
        ],
      });

      const after = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-roles",
                name: "roles",
              }),
            ],
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_active_users",
            definition: `
              SELECT * FROM public.roles
              -- Dependency on users table? No, this is a comment referring to public.users
              /* Or maybe a multi-line comment referencing users */
              WHERE name = 'users'
            `,
            isMaterialized: false,
          },
        ],
      });

      const diff = diffProjects(before, after);

      const hasDropView = diff.operations.some((op) => op.kind === "DROP_VIEW");
      expect(hasDropView).toBe(false);

      const hasDropTable = diff.operations.some((op) => op.kind === "DROP_TABLE" && op.tableName === "users");
      expect(hasDropTable).toBe(true);
    });
  });
});
