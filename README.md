<p align="center">
  <img src="build/icon.png" alt="Qube Modeler" width="150" height="150" />
</p>

<h1 align="center">Qube Modeler</h1>

<p align="center">
  Local-first desktop application for visually modeling PostgreSQL databases and organizing Flyway migrations.
</p>

---

Qube Modeler is a local-first desktop application for visually modeling PostgreSQL database structures and organizing Flyway migration history.

It allows you to design schemas, tables, columns, sequences, constraints, indexes and relationships visually, then generate SQL scripts and versioned Flyway migrations from the model.

The official project file format is `.qbm`.

## Features

- Visual PostgreSQL database modeling
- Local-first `.qbm` project files
- Save, Save As and Open project workflows
- Recent projects
- Full SQL export
- Flyway migration history
- Initial migration generation
- Incremental migration generation by project diff
- Manual before/after migration scripts
- SQL preview and migration export
- Destructive operation warnings
- Window state persistence
- `.qbm` file association
- Windows installer with license agreement

## Project Philosophy

Qube Modeler does not execute migrations.

The application generates and organizes SQL migration files, but the responsibility for running them remains with the target application and Flyway.

Recommended workflow:

1. Model the database visually in Qube Modeler.
2. Generate or update Flyway migrations.
3. Review the generated SQL.
4. Export the migration SQL.
5. Commit the `.qbm` file and migration scripts to Git.
6. Let the application/Flyway execute the migration.

Always review generated SQL before applying it to any database environment.

## `.qbm` Project Files

`.qbm` is the official Qube Modeler project format.

A `.qbm` file stores:

- project metadata
- database model
- schemas
- tables
- columns
- sequences
- constraints
- indexes
- Flyway migration history
- migration snapshots
- generated SQL
- manual before/after migration scripts

`.qbm` files are plain JSON and are designed to be versioned with Git.

Do not store passwords, tokens, credentials or sensitive secrets inside `.qbm` files.

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- React Flow
- Vitest
- electron-builder

## Development

Install dependencies:

```bash
pnpm install
````

Run in development mode:

```bash
pnpm dev
```

Run lint:

```bash
pnpm lint
```

Run unit tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

Build the application:

```bash
pnpm build
```

Create the desktop package/installer:

```bash
pnpm package
```

## Validation Before Release

Before creating a release build, run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm package
```

Expected result:

* lint passes
* all unit tests pass
* production build succeeds
* Electron installer is generated successfully

## Project Structure

```text
src/
  app/
    canvas/
      components/   # visual editor components
      dialogs/      # create/edit forms
      hooks/        # React Flow integration and state
      mappers/      # domain-to-diagram mapping
      styles/       # component styles
    shared/         # reusable UI components and utilities

  core/
    diff/           # project diff engine
    diagram/        # diagram-independent types
    migration/      # Flyway migration SQL generation
    model/          # domain types, queries and commands
    qbm/            # .qbm file creation and parsing
    sql/            # PostgreSQL SQL generation
    validation/     # structural validation by entity
    test-utils/     # unit test fixtures

  styles/
    tokens.css      # global design tokens

electron/
  main.ts           # Electron main process
  preload.ts        # safe bridge between renderer and main
  window-state.ts   # window state persistence

build/
  icons/            # app and file icons
  installer/        # installer license/notice

release/
  # generated desktop builds and installers
```

## Architecture Rules

* `core` must not depend on React or visual components.
* `core` contains the domain model, validation, diff and SQL generation logic.
* React components must use public domain types and commands.
* Electron file-system operations must stay in the main process.
* The renderer must access desktop capabilities only through the preload API.
* `.qbm` parsing must be strict enough to avoid silent data loss.
* Migration history must never be discarded silently.
* Generated SQL must favor explicit and reviewable operations.
* Destructive operations must be clearly marked and require user awareness.
* Styles should follow the existing component naming conventions and design tokens.

## Testing Strategy

The current automated tests focus on the critical core modules:

* `.qbm` creation and parsing
* strict validation of migration history
* project diff operations
* PostgreSQL SQL generation
* Flyway migration SQL generation
* safe ordering of migration operations
* sequence/default handling
* rename and destructive-operation regressions

Run:

```bash
pnpm test
```

Coverage:

```bash
pnpm test:coverage
```

Unit tests do not run Electron and do not require a PostgreSQL database.

## Packaging

The project uses `electron-builder`.

The Windows package includes:

* NSIS installer
* license agreement step
* application icon
* `.qbm` file association
* single-instance behavior
* desktop app executable

Generated artifacts are written to:

```text
release/
```

## Versioning

The application version is defined in `package.json`.

Electron reads the app version from the package metadata using `app.getVersion()`.

For release candidates, use tags such as:

```text
v1.0.0-rc.1
```

For stable releases:

```text
v1.0.0
```

## Release Checklist

Before publishing a release:

* [ ] `pnpm lint` passes
* [ ] `pnpm test` passes
* [ ] `pnpm build` passes
* [ ] `pnpm package` succeeds
* [ ] installer opens correctly
* [ ] license agreement is displayed
* [ ] app opens after installation
* [ ] `.qbm` file association works
* [ ] double-clicking `.qbm` opens the project
* [ ] Save/Open/Save As workflows work
* [ ] initial migration generation works
* [ ] incremental migration generation works
* [ ] SQL export works
* [ ] unsaved changes prompt works

## Important Notice

Qube Modeler is a modeling and SQL generation tool.

It does not guarantee that generated SQL is safe for every database state or production environment.

Always review, test and backup before applying generated SQL scripts.