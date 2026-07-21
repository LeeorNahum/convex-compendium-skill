---
name: "convex-compendium"
description: "Build, integrate, secure, migrate, and optimize Convex backends. Use for Convex schemas, queries, mutations, actions, HTTP actions, auth, components, migrations, indexes, OCC conflicts, files, scheduling, or performance. Also use when a repository contains the convex package, convex/schema.ts, convex/_generated/api, convex/react, convex/server, generated api or internal references, ctx.db, stale Convex types, or a Convex function-boundary problem even when the user does not name Convex."
metadata:
  author: "Leeor Nahum"
  version: "2.2.0"
---

# Convex Compendium

The self-contained entry point for Convex work. Its task workflows and canonical guidelines are vendored from Convex's official sources so one installed skill behaves consistently across agents.

## Inspect the Repository First

Before editing:

1. Identify the package manager and lockfile.
2. Record the exact installed `convex` version plus relevant component and authentication packages.
3. Inspect `convex.json`, package scripts, the application framework, runtime, and target deployment.
4. Inspect `convex/schema.ts`, indexes, `convex/_generated/`, and whether generated types match the current functions.
5. Inspect authentication configuration and client provider wiring.
6. Locate existing queries, mutations, actions, internal functions, HTTP routes, crons, components, and tests in the affected path.
7. Preserve working project conventions unless migration or replacement was requested.

## Source Precedence

Use sources in this order:

1. Installed package exports, types, generated files, and compiler behavior.
2. The target repository's code, configuration, tests, and deployment contract.
3. The [canonical Convex guidelines](references/guidelines.md) when the installed version fits the target range declared at the top of that file.
4. The applicable bundled task workflow below.
5. Matching first-party released documentation or source for version-sensitive details.
6. Moving default branches only as discovery evidence, never as proof of released behavior.

When the installed version falls outside the bundled guidelines' declared range, verify version-sensitive APIs against installed types and matching released first-party material before using them.

## Route to the Right Reference

Load only the references needed for the current task:

- Read the [quickstart workflow](references/quickstart.md) when creating a Convex project or adding Convex to an existing application.
- Read the [authentication workflow](references/auth.md) when configuring identity providers, backend identity, user mapping, or authorization.
- Read the [component workflow](references/components.md) when building, extracting, or packaging a reusable Convex component.
- Read the [migration workflow](references/migrations.md) before a schema, data, or index change that requires staged compatibility.
- Read the [performance workflow](references/performance.md) when investigating slow functions, read amplification, subscription cost, transaction limits, OCC conflicts, or hot documents.

For any Convex code you write or review, consult the [canonical Convex guidelines](references/guidelines.md). They cover the function, validator, schema, index, pagination, HTTP, file, and scheduling contracts that underpin every task workflow.

## Core Workflow

1. **Choose the correct boundary.** Use a query for deterministic reads, a mutation for transactional database changes, an action for external side effects or runtime-specific code, an HTTP action for external HTTP entry points, and an internal function for implementation details that should not be public API.
2. **Define the contract.** Validate arguments and schema fields. Add return validators when the installed version and project convention support them. Use indexes in their declared field order. Bound result sets with pagination or `take` unless the complete result is explicitly required and known to stay small.
3. **Establish trusted identity.** Derive identity through Convex backend authentication where the operation executes. A client-supplied user identifier is a resource selector, never proof of authorization.
4. **Keep execution boundaries honest.** Queries stay deterministic. Mutations keep related reads and writes in one transaction where possible. Actions do not use `ctx.db`. HTTP webhooks verify the request before trusting fields and persist through internal functions.
5. **Call functions through generated references.** Use generated `api` references for public functions and generated `internal` references for private implementation calls.
6. **Validate the real project.** Regenerate types, run package-aligned typechecks and tests, then use a one-shot Convex development validation command when appropriate. Reserve production deployment for explicit production work.

## Operating Rules

- Use the package manager already chosen by the repository. Examples in vendored references may use npm syntax, but the target repository owns the actual command form.
- Use `convex dev --once` through the repository's package runner for an agent-owned validation pass that exits. Keep the long-running watcher in a user terminal or background process.
- Inspect the installed CLI help before relying on a version-sensitive command or option.
- Use the AI guidance already bundled here instead of installing duplicate per-agent copies or managed instruction blocks.
- Treat the Convex editor plugin and MCP server as optional tools, not prerequisites.
- Use development deployments for development validation. Deploy to production only when the user explicitly requests production work.

## Maintenance Boundary

The `references/` files are generated by the [synchronizer](scripts/sync.mjs). Do not hand-edit them. Exact upstream revisions are emitted by the synchronizer and recorded by automated refresh commits. Stable source and output hashes live in the [source manifest](references/source-manifest.json). Authored maintenance rules live in `AGENTS.md`.
