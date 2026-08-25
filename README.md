# convex-compendium

A portable [Agent Skill](https://agentskills.io) that bundles Convex's official task workflows and canonical correctness guidelines for consistent use across coding agents.

## Install

```bash
git submodule add https://github.com/LeeorNahum/convex-compendium-skill.git .agents/skills/convex-compendium
```

The skill is self-contained. It does not require duplicate AI-file installation, managed instruction blocks, an editor plugin, or an MCP server.

## Contents

| Path                              | Purpose                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `SKILL.md`                        | Trigger, repository-first workflow, source precedence, and task routing                 |
| `references/*.md`                 | Generated quickstart, auth, component, migration, performance, and correctness guidance |
| `references/source-manifest.json` | Stable source, license, blob, and content provenance                                    |
| `scripts/sync.mjs`                | Deterministic upstream synchronization with no-write checking                           |
| `scripts/*.test.mjs`              | Synchronizer and eval-structure tests                                                   |
| `evals/`                          | Trigger cases and fixture-backed workflow evaluations                                   |

## Refresh and Validate

```bash
node scripts/sync.mjs
node scripts/sync.mjs --check
node --test scripts/sync.test.mjs scripts/evals.test.mjs
```

Generated references come from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) and the canonical [convex-evals guidelines](https://github.com/get-convex/convex-evals/blob/main/runner/models/guidelines.md). The quickstart, auth, migration, and performance workflows are frozen at the last upstream revision that published them, because upstream replaced them with short generated procedures on 2026-08-01. `references/source-manifest.json` records the pinned commit and the reason. The task repository has no explicit detected license. The guidelines repository reports Apache-2.0. Exact source revisions are recorded by synchronization output and automated refresh commits. Maintenance policy lives in `AGENTS.md`.
