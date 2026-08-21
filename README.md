<p align="center">
  <img src="build/icon.png" alt="Qube Modeler" width="150" height="150" />
</p>

<h1 align="center">Qube Modeler</h1>

<p align="center">
  Visual database modeling for PostgreSQL and Flyway migrations.
</p>

---

## What is Qube Modeler?

Qube Modeler is a desktop application for designing PostgreSQL database models visually and generating Flyway migration scripts from your changes.

Instead of writing every migration manually from scratch, you can model your database, review the generated SQL, and export versioned migration scripts for your project.

Qube Modeler is local-first: your work is saved in `.qbm` project files on your machine.

## What can you do with it?

- Design PostgreSQL schemas visually
- Create tables, columns, sequences, indexes and constraints
- Define relationships between tables
- Generate an initial Flyway migration
- Generate new migrations from model changes
- Add manual SQL scripts before or after generated migrations
- Preview generated SQL before exporting
- Export migration SQL files
- Save and reopen projects using `.qbm` files
- Keep your database model and migration history versioned with Git

## Who is it for?

Qube Modeler is intended for developers and teams that use PostgreSQL and Flyway, especially when they want a visual way to design and evolve a database model.

It is useful when you want to:

- plan a database structure before writing SQL
- keep a visual model close to your migration history
- reduce repetitive migration writing
- review database changes before applying them
- keep project files under version control

## How it works

A typical workflow looks like this:

1. Create or open a `.qbm` project.
2. Model your database visually.
3. Generate the initial migration.
4. Make changes to the model over time.
5. Generate new migrations from those changes.
6. Review the SQL.
7. Export the migration script.
8. Commit the `.qbm` file and migration scripts to Git.
9. Let your application run the migrations with Flyway.

Qube Modeler does not execute migrations directly.  
It helps you design, organize and generate migration scripts.

## Project files

Qube Modeler uses `.qbm` files as its official project format.

A `.qbm` file stores your database model and Flyway migration history locally.

You can keep this file in your repository together with your application code and migration scripts.

Do not store passwords, tokens or credentials inside `.qbm` files.

## Safety notice

Generated SQL should always be reviewed before being applied to any database.

Before running migrations in production or critical environments, make sure you have:

- reviewed the generated SQL
- tested it in a safe environment
- created backups when necessary
- followed your team's approval process

Qube Modeler helps generate migration scripts, but you are responsible for deciding when and where to apply them.

## Download and install

Download the latest Windows installer from the Releases page.

After installation, `.qbm` files can be opened directly with Qube Modeler.

## Development

This section is only needed if you want to run the project from source.

Install dependencies:

```bash
pnpm install
````

Run in development mode:

```bash
pnpm dev
```

Run checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Create the desktop package/installer:

```bash
pnpm package
```

## Tech stack

Qube Modeler is built with:

* Electron
* React
* TypeScript
* Vite
* React Flow
* Vitest
* electron-builder

## Version

Current version:

```text
1.0.0
```

## License

Qube Modeler is source-available software for personal, educational, evaluation, internal development, and non-commercial use.

You may download, install, run, and use the application for non-commercial purposes.

Commercial use, resale, redistribution, rebranding, publishing modified builds, or offering Qube Modeler as a product or service is not permitted without prior written permission.

See [LICENSE](LICENSE) for details.