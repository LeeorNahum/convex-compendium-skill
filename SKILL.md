---
name: "convex-compendium"
description: "Build and maintain Convex backends in any AI coding agent - schema, queries, mutations, actions, HTTP endpoints, file storage, scheduling, auth, components, migrations, and performance. Use when writing or reviewing Convex code, scaffolding a Convex project, setting up authentication, designing a schema, building a reusable component, planning a migration, or diagnosing Convex performance."
metadata:
  author: "Leeor Nahum"
  version: "2.1.0"
---

# Convex Compendium

The single, self-contained entry point for Convex work. Everything this skill needs is bundled in `references/`, vendored from Convex's official sources so it travels with one submodule and works the same across every agent.

## Route to the Right Reference

Load the one reference that matches the task:

- Read `references/quickstart.md` when starting a new Convex project or adding Convex to an existing app.
- Read `references/auth.md` when setting up authentication, user/identity mapping, or an auth provider (Convex Auth, Clerk, WorkOS AuthKit, Auth0, custom JWT).
- Read `references/components.md` when building or packaging a reusable Convex component.
- Read `references/migrations.md` when planning or running a schema or data migration.
- Read `references/performance.md` when diagnosing slow functions, OCC conflicts, hot paths, or subscription cost.

Load only what the current task needs. Do not preload every reference.

## Guidelines Underpin Everything

For any Convex code you write or review, consult `references/guidelines.md` - the foundational correctness reference covering function syntax, validators, schema design, indexing, pagination, queries vs mutations vs actions, HTTP endpoints, file storage, and scheduling. Most Convex mistakes come from skipping it.

## Operating Rules

- Keep `npx convex dev` running in your own terminal so generated types stay fresh. Without it, agents get stuck in linting loops over missing `_generated` types.
- Use the Convex CLI (`npx convex ...`) for real actions: `dev`, `deploy`, `run`, `env`, `import`, `dashboard`, deployment and codegen commands. Inspect `npx convex --help` to discover the current surface.
- Use the AI guidance already bundled in this skill instead of the Convex `ai-files` installer, which writes per-agent skill copies and managed `AGENTS.md`/`CLAUDE.md` sections that duplicate what is already here.
- Use the CLI plus this skill for development and inspection. The Convex editor plugin and MCP server are optional extras, not requirements.
- Use `npx convex dev` for local development. Reserve `npx convex deploy` for production only.

## Provenance

The `references/` files are generated from upstream by `scripts/sync.mjs`. Do not hand-edit them. The exact upstream commit is recorded in each sync commit message. To change how this skill behaves, edit this file and follow `AGENTS.md`.
