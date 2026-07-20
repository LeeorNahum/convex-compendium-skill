# AGENTS.md

Rules for maintaining the **convex-compendium** skill. This is the living source of truth for what the skill is, where its content comes from, and how to update it. User-facing guidance lives in `SKILL.md` and `references/`. This file governs the repo itself.

## What this skill is

A single, portable agent skill that bundles all of Convex's official AI guidance into one submodule so it works the same across every agent (Cursor, Claude Code, Codex, opencode, Copilot, ...). It follows the open Agent Skills standard: one `SKILL.md` at the repo root plus progressive-disclosure `references/`.

It deliberately replaces the Convex `ai-files` install flow. Consumers get everything by submoduling this repo. They do not run `npx convex ai-files install`, and they do not need the Convex editor plugin / MCP server.

## File roles

| Path | Role | Edited by |
| --- | --- | --- |
| `SKILL.md` | Router: routes to task references, points to guidelines, operating rules. Owns `metadata.version`. | Hand |
| `references/<task>.md` | One flattened task workflow per file (quickstart, auth, components, migrations, performance). | `scripts/sync.mjs` (generated) |
| `references/guidelines.md` | Foundational Convex correctness rules. | `scripts/sync.mjs` (generated) |
| `scripts/sync.mjs` | The only place that knows how to fetch and transform upstream content. | Hand |
| `.github/workflows/sync-upstream.yml` | Runs the sync on a schedule and on demand. Records both upstream commits in the commit message. | Hand |
| `.gitattributes` | Forces LF so Windows-local and Linux-CI runs never disagree. | Hand |
| `README.md` | Short human skim layer: value + install. | Hand |
| `AGENTS.md` | This file. Maintenance contract. | Hand |

One owner per concern. Never hand-edit a generated file. Change `scripts/sync.mjs` and re-run it.

## Sources of truth

The skill vendors from exactly two upstream sources. There is no third source, and the Convex MCP/plugin is never a source. The agent-skills repo is the primary, actively-developed source. The rules text is the smaller, foundational layer.

| Source | URL | Lands in |
| --- | --- | --- |
| Convex agent skills | `https://github.com/get-convex/agent-skills` (folder `skills/`) | `references/<task>.md` |
| Convex rules body | `https://github.com/get-convex/convex-evals/blob/main/runner/models/guidelines.md` | `references/guidelines.md` |

Context worth remembering:

- The rules body is one canonical text in `get-convex/convex-evals/runner/models/guidelines.md`. Convex's release builder repackages it per IDE as `convex_rules.txt`, `convex_rules.mdc` for Cursor with `description`/`globs` frontmatter, `convex.instructions.md` for Copilot with `applyTo`, and managed sections in `AGENTS.md`/`CLAUDE.md`. We pull the canonical Markdown source directly because the plain release asset is written from it unchanged, while release publication can fail independently. The `.mdc` is not obsolete. It is the Cursor-flavored wrapper, which we do not want.
- Rules and skills are complementary, not redundant. The task skills are on-demand workflows. The rules body is always-on correctness knowledge they assume exists. The upstream `convex` router skill does not contain the rules body. It points to them instead, so we bundle both: the task skills plus guidelines.
- The upstream `convex` router skill is intentionally excluded. Its only job is to recommend `npx convex ai-files install`, which is exactly what this skill exists to avoid. `SKILL.md` provides the routing instead.

## How sync works

`scripts/sync.mjs` (run by the workflow and runnable locally with `node scripts/sync.mjs`):

1. Resolves the latest commits of both `get-convex/agent-skills` and `get-convex/convex-evals` before downloading anything, so every file in one run comes from a fixed upstream snapshot.
2. For each mapped agent skill, flattens its `SKILL.md` + `references/*.md` into one `references/<task>.md`. It strips the upstream YAML frontmatter and leading H1, demotes sub-reference headings, rewrites flattened sub-reference links, and neutralizes every `ai-files install` recommendation.
3. Downloads the canonical `convex-evals/runner/models/guidelines.md` rules body to `references/guidelines.md` with a provenance header.
4. Prints both exact upstream commits and writes them to `GITHUB_OUTPUT`. The workflow puts them in the sync commit message. Provenance lives in git history, not a tracked manifest file.
5. Never touches `SKILL.md` `metadata.version`.

The skill-to-file mapping lives in the `SKILL_MAP` constant in `scripts/sync.mjs`. Generated reference headers carry the source path but no commit SHA, so a reference only changes when its actual content changes.

## When upstream changes - what to check

Run `node scripts/sync.mjs`, then review the diff and check:

- **`references/` content changed**: normal refresh. Confirm the `ai-files install` rewrite still caught everything (`rg "ai-files install" references` must return nothing) and headings still nest cleanly.
- **A skill was added upstream** (new folder under `skills/`): add it to `SKILL_MAP` in `scripts/sync.mjs`, add a routing line to `SKILL.md`, and mention it in `README.md`.
- **A skill was renamed or removed upstream**: update `SKILL_MAP`, delete the stale `references/<task>.md`, and update `SKILL.md` routing.
- **The canonical rules path or format changed**: update `RULES_PATH` in `scripts/sync.mjs`, verify Convex's release builder still emits the same body, and re-check `references/guidelines.md`.

## Versioning

`metadata.version` in `SKILL.md` is the version surface. Bump it by hand with [semver](https://semver.org/) when this skill's own authored behavior changes - patch for wording, minor for new routing or guidance, major for a renamed skill or changed scope.

Upstream provenance is separate: the sync commit message records the exact `get-convex/agent-skills` and `get-convex/convex-evals` commits, and an automated content refresh does not bump `metadata.version`.

## Editing protocol

- Ask before touching each hand-edited file, and pause for review between files.
- Encode defaults only when backed by usage or explicit user preference.
- Prefer deletion over caveats.
- Before committing, inspect repo state, run available checks (`node scripts/sync.mjs` to confirm a clean generation, lint/format if configured), and confirm. Do not commit a state where generated files disagree with the script.

## Wording and boundaries

- **Generic and portable**: no agent-specific assumptions baked into `SKILL.md` or references, no personal paths, no machine-specific context. Convex proper nouns are fine because this skill is scoped to Convex.
- **Positive rules**: state what to do. Describe mistake categories (for example, "do not run the ai-files installer") rather than anchoring to one user's setup.
- **Progressive disclosure**: `SKILL.md` says exactly when to read each reference. A reference that `SKILL.md` never points to is bloat.
- **No meta leakage**: keep planning residue and conversational context out of `SKILL.md` and `references/`.
- **Quoted frontmatter**: quote every frontmatter string value in `SKILL.md`. Keys stay unquoted.
- **No em dashes, no joiner semicolons**: in hand-edited files only. Generated `references/` files keep upstream styling verbatim.
- **Capitalized bullets**: parallel list voice throughout hand-edited files.

## Before finishing

- `rg "ai-files install" references` returns nothing.
- Every `references/` file is reachable from a routing line in `SKILL.md`.
- `metadata.version` bumped if and only if this skill's authored behavior changed.
- `README.md` still matches the install path and skill list.
