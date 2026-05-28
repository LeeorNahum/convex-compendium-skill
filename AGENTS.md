# AGENTS.md

Rules for maintaining the **convex-compendium** skill. This is the living source of truth for what the skill is, where its content comes from, and how to update it. User-facing guidance lives in `SKILL.md` and `references/`; this file governs the repo itself.

## What this skill is

A single, portable agent skill that bundles all of Convex's official AI guidance into one submodule so it works the same across every agent (Cursor, Claude Code, Codex, opencode, Copilot, ...). It follows the open Agent Skills standard: one `SKILL.md` at the repo root plus progressive-disclosure `references/`.

It deliberately replaces the Convex `ai-files` install flow. Consumers get everything by submoduling this repo; they do not run `npx convex ai-files install`, and they do not need the Convex editor plugin / MCP server.

## File roles

| Path | Role | Edited by |
| --- | --- | --- |
| `SKILL.md` | Router: routes to task references, points to guidelines, operating rules. Owns `metadata.version`. | Hand |
| `references/<task>.md` | One flattened task workflow per file (quickstart, auth, components, migrations, performance). | `scripts/sync.mjs` (generated) |
| `references/guidelines.md` | Foundational Convex correctness rules. | `scripts/sync.mjs` (generated) |
| `scripts/sync.mjs` | The only place that knows how to fetch and transform upstream content. | Hand |
| `.github/workflows/sync-upstream.yml` | Runs the sync on a schedule and on demand; records the upstream commit in the commit message. | Hand |
| `.gitattributes` | Forces LF so Windows-local and Linux-CI runs never disagree. | Hand |
| `README.md` | Short human skim layer: value + install. | Hand |
| `AGENTS.md` | This file. Maintenance contract. | Hand |

One owner per concern. Never hand-edit a generated file; change `scripts/sync.mjs` and re-run it.

## Sources of truth

The skill vendors from exactly two upstream sources. There is no third source, and the Convex MCP/plugin is never a source. The agent-skills repo is the primary, actively-developed source; the rules text is the smaller, foundational layer.

| Source | URL | Lands in |
| --- | --- | --- |
| Convex agent skills | `https://github.com/get-convex/agent-skills` (folder `skills/`) | `references/<task>.md` |
| Convex rules body | `https://convex.link/convex_rules.txt` | `references/guidelines.md` |

Context worth remembering:

- The rules body is one canonical text, repackaged per IDE elsewhere (`convex_rules.mdc` for Cursor with `description`/`globs` frontmatter, `convex.instructions.md` for Copilot with `applyTo`, managed sections in `AGENTS.md`/`CLAUDE.md`, `guidelines.md` via the CLI). We pull the plain `.txt` because it carries no agent-specific wrapper. The `.mdc` is not obsolete - it is just the Cursor-flavored wrapper, which we do not want.
- Rules and skills are complementary, not redundant. The task skills are on-demand workflows; the rules body is always-on correctness knowledge they assume exists. The upstream `convex` router skill does not contain the rules body - it points to them. So we bundle both: the task skills plus guidelines.
- The upstream `convex` router skill is intentionally excluded. Its only job is to recommend `npx convex ai-files install`, which is exactly what this skill exists to avoid. `SKILL.md` provides the routing instead.

## How sync works

`scripts/sync.mjs` (run by the workflow and runnable locally with `node scripts/sync.mjs`):

1. Resolves the latest `get-convex/agent-skills` commit, then for each mapped skill flattens its `SKILL.md` + `references/*.md` into one `references/<task>.md`: strips the upstream YAML frontmatter and leading H1, demotes sub-reference headings, and neutralizes every `ai-files install` recommendation.
2. Downloads the rules body to `references/guidelines.md` with a provenance header.
3. Prints the exact upstream commit and writes it to `GITHUB_OUTPUT`; the workflow puts it in the sync commit message. Provenance lives in git history, not a tracked manifest file.
4. Never touches `SKILL.md` `metadata.version`.

The skill-to-file mapping lives in the `SKILL_MAP` constant in `scripts/sync.mjs`. Generated reference headers carry the source path but no commit SHA, so a reference only changes when its actual content changes.

## When upstream changes - what to check

Run `node scripts/sync.mjs`, then review the diff and check:

- **`references/` content changed**: normal refresh. Confirm the `ai-files install` rewrite still caught everything (`rg "ai-files install" references` must return nothing) and headings still nest cleanly.
- **A skill was added upstream** (new folder under `skills/`): add it to `SKILL_MAP` in `scripts/sync.mjs`, add a routing line to `SKILL.md`, and mention it in `README.md`.
- **A skill was renamed or removed upstream**: update `SKILL_MAP`, delete the stale `references/<task>.md`, and update `SKILL.md` routing.
- **The rules `.txt` URL or format changed**: update the `RULES_URL` constant and re-verify `references/guidelines.md`.

## Versioning

Decoupled on purpose, so the version stays honest:

- `SKILL.md` `metadata.version` tracks **only this skill's own authored behavior** (routing, operating rules, structure). Bump it by hand with semver when that behavior changes - patch for wording, minor for new routing/guidance, major for renamed skill or changed scope.
- **Upstream provenance lives in git history** - the sync commit message records the exact `get-convex/agent-skills` commit. An automated content refresh does not bump `metadata.version`; a vendor refresh is not "our" behavior change.
- For public releases and tags, follow the release-versioning workflow: align tag, `metadata.version`, and any README badge.

## Editing protocol

- Ask before touching each hand-edited file; pause for review between files.
- Encode defaults only when backed by usage or explicit user preference.
- Prefer deletion over caveats.
- Before committing, inspect repo state, run available checks (`node scripts/sync.mjs` to confirm a clean generation; lint/format if configured), and confirm. Do not commit a state where generated files disagree with the script.

## Wording and boundaries

- **Generic and portable**: no agent-specific assumptions baked into `SKILL.md` or references, no personal paths, no machine-specific context. Convex proper nouns are fine because this skill is scoped to Convex.
- **Positive rules**: state what to do. Describe mistake categories (for example, "do not run the ai-files installer") rather than anchoring to one user's setup.
- **Progressive disclosure**: `SKILL.md` says exactly when to read each reference. A reference that `SKILL.md` never points to is bloat.
- **No meta leakage**: keep planning residue and conversational context out of `SKILL.md` and `references/`.

## Before finishing

- `rg "ai-files install" references` returns nothing.
- Every `references/` file is reachable from a routing line in `SKILL.md`.
- `metadata.version` bumped if and only if this skill's authored behavior changed.
- `README.md` still matches the install path and skill list.
