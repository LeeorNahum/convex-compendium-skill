# Convex Compendium Maintenance

This file governs the `convex-compendium` repository. User-facing operating guidance lives in `SKILL.md` and generated `references/`.

## Purpose

Convex Compendium is one portable Agent Skill that bundles Convex's task-specific AI guidance and canonical correctness guidelines. Consumers install one submodule. They do not need duplicate per-agent skill copies, managed instruction blocks, an editor plugin, or an MCP server.

## File Ownership

| Path                                  | Role                                                                            | Owner              |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| `SKILL.md`                            | Trigger, source precedence, task routing, and universal workflow                | Hand-authored      |
| `references/*.md`                     | Flattened Convex task workflows and canonical guidelines                        | `scripts/sync.mjs` |
| `references/source-manifest.json`     | Stable source, license, blob, and content provenance                            | `scripts/sync.mjs` |
| `scripts/sync.mjs`                    | Source discovery, validation, transformation, comparison, and atomic generation | Hand-authored      |
| `scripts/sync.test.mjs`               | Deterministic synchronizer tests                                                | Hand-authored      |
| `scripts/evals.test.mjs`              | Eval manifest and fixture validation                                            | Hand-authored      |
| `evals/trigger-queries.json`          | Trigger and near-miss cases                                                     | Hand-authored      |
| `evals/evals.json` and `evals/files/` | Workflow cases and input fixtures                                               | Hand-authored      |
| `.github/workflows/sync-upstream.yml` | Scheduled source refresh and verification                                       | Hand-authored      |
| `README.md`                           | Concise human overview                                                          | Hand-authored      |
| `.gitattributes`                      | LF normalization                                                                | Hand-authored      |
| `AGENTS.md`                           | This maintenance contract                                                       | Hand-authored      |

Never hand-edit a generated reference. Fix the synchronizer and regenerate the complete set.

## Sources and Precedence

The skill vendors exactly two first-party source repositories:

| Source                                                                | Content                          | Destination                                                         | License observation                     |
| --------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| [get-convex/agent-skills](https://github.com/get-convex/agent-skills) | Task skills under `skills/`      | `references/{quickstart,auth,components,migrations,performance}.md` | No explicit repository license detected |
| [get-convex/convex-evals](https://github.com/get-convex/convex-evals) | `runner/models/guidelines.md`    | `references/guidelines.md`                                          | Apache-2.0                              |

The absent detected license on `get-convex/agent-skills` is an accepted observation for this repository's small self-contained vendored task model. Record and report it. Do not silently reinterpret it as a license grant. Fail if `get-convex/convex-evals` no longer reports Apache-2.0 because that changes the known redistribution basis for the canonical guidelines.

At use time, `SKILL.md` gives installed package contracts and the target repository precedence over bundled guidance. Moving upstream branches are discovery sources, not proof that released packages expose an API.

## Closed Task Mapping

`scripts/sync.mjs` records a decision for every `convex-*` folder under upstream `skills/`.

Live mapping, rendered from the upstream default branch:

- `convex-create-component` to `components.md`

Frozen mapping, rendered from upstream commit `ec1e6baae7d86c7843c22938c75979c016f5c6e9` since 2026-08-25:

- `convex-quickstart` to `quickstart.md`, superseded upstream by a regenerated `convex-quickstart`
- `convex-setup-auth` to `auth.md`, superseded upstream by `convex-auth`
- `convex-migration-helper` to `migrations.md`, superseded upstream by `convex-migrate`
- `convex-performance-audit` to `performance.md`, superseded upstream by `convex-optimize` and `convex-advisor`

On 2026-08-01 upstream regenerated its catalog from the convex-agents hub (get-convex/agent-skills#22). The replacements are short procedures that depend on hub tooling such as the served capability catalog, recipes, the findings bus, and MCP tools. They drop the provider, migration, and performance reference material bundled here. Freezing keeps that coverage. Git history is immutable, so the frozen sources are fetched and rendered on every run and are never copied by hand.

Every other upstream folder, including the `convex` router and the generated hub procedures, is excluded with a recorded reason in the script and the manifest. Unfreezing a workflow or vendoring a new upstream skill is an authored decision that changes the skill version.

Synchronization fails when a live mapped task disappears, a new `convex-*` folder appears without a decision, a frozen folder reappears at the default branch without a decision, a frozen source is missing at the pinned commit, a tree is truncated, a source path becomes nested unexpectedly, frontmatter no longer matches its folder, links cannot be flattened, or canonical guideline structure drifts. An exclusion decision that no longer matches an upstream folder only warns.

## Synchronization Contract

Run from this repository:

```text
node scripts/sync.mjs
node scripts/sync.mjs --check
node scripts/sync.mjs --help
```

The script can pin both repositories with full SHAs. Frozen task skills ignore the agent-skills pin and always resolve the frozen commit. It resolves every revision before fetching bodies, validates final HTTPS hosts, fetches every required source, transforms all output in memory, validates the complete set, then replaces `references/` atomically. A failed fetch or transform must leave disk unchanged.

Generated Markdown receives a source banner and stable source link without a moving commit SHA. Frozen references link the pinned commit and carry a dated freeze notice. `source-manifest.json` records repository metadata, license observations, live, frozen, and excluded task decisions, the guidelines' declared Convex range, every source path and blob SHA, the pinned commit of every frozen source, source content hashes, output hashes, and output-to-source relationships. Exact resolved default-branch commits belong in command output and refresh commit messages.

`--check` performs no writes. It reports missing, changed, and stale generated files separately. Normal generation refuses to delete an unrecognized hand-authored reference.

The transform flattens direct `references/*.md` files, namespaces their anchors, rewrites local links, preserves fenced code structure, removes duplicate document H1s, and neutralizes executable installer guidance. The final output must contain no executable `convex ai-files install` command.

Automated source refreshes never edit `SKILL.md` or change `metadata.version`.

## Evaluations

Trigger cases test direct Convex requests, repository signals, and nearby non-Convex tasks. Workflow cases use small fixtures to test durable behavior such as installed-version inspection, trusted identity, function boundaries, indexes, migrations, webhooks, OCC design, component isolation, and runtime validation.

Run structural tests locally and in automation. Model-based with-skill and baseline runs are explicit evaluation work. Do not run or commit token-heavy eval workspaces, transcripts, grading output, timing files, or benchmark files as part of a normal source refresh.

## Versioning

`metadata.version` in `SKILL.md` follows Semantic Versioning:

- Patch for wording corrections and narrow clarifications
- Minor for new guidance, wider triggering, new task routing, or maintenance behavior
- Major for renamed scope or incompatible skill behavior

A source-only refresh does not change the skill version. Authored behavior changes and their generated outputs ship together at one appropriate version.

## Wording and Scope

- Keep the skill generic across Convex projects and agents.
- Keep user-facing guidance in `SKILL.md` and conditional references.
- Keep maintenance instructions here.
- State contracts and real boundaries without enumerating obvious instances.
- Preserve upstream prose in generated references except for documented bundling transforms.
- Quote every string value in `SKILL.md` frontmatter.
- Use capitalized parallel bullets in hand-authored files.
- Do not write em dashes or use semicolons as prose joiners in hand-authored files.
- Keep every support reference directly reachable from `SKILL.md`.

## Finishing Checks

Run:

```text
node --check scripts/sync.mjs
node --test scripts/sync.test.mjs scripts/evals.test.mjs
node scripts/sync.mjs
node scripts/sync.mjs --check
node ../skill-forge/scripts/validate.mjs .
git diff --check
```

Also confirm:

- A second generation produces no changes.
- Every generated output and source has a stable hash in `source-manifest.json`.
- No executable installer command remains in `references/`.
- Every reference is routed directly from `SKILL.md`.
- `metadata.version` changed if and only if authored behavior changed.
- `README.md`, the workflow, tests, and generated ownership still agree.
- Only intended files are modified before any commit.
