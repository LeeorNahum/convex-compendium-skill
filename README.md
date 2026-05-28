# convex-compendium

One portable [Agent Skill](https://agentskills.io) that bundles all of Convex's official AI guidance - the quickstart, auth, components, migrations, and performance workflows plus the correctness guidelines - so any AI coding agent gets everything from a single submodule.

It replaces the `npx convex ai-files install` flow (which clutters a repo with per-agent skill copies and managed `AGENTS.md`/`CLAUDE.md` sections) and needs no Convex editor plugin or MCP server. The CLI plus this skill are enough.

## Install

Add as a submodule into your agent's skills directory:

```bash
git submodule add https://github.com/LeeorNahum/convex-compendium-skill.git .agents/skills/convex-compendium
```

`.agents/skills/` is read by Cursor, Claude Code, Codex, and other agents. Keep your own personal skills in the sibling `.cursor/skills/` directory so they never collide with this submodule.

Then keep `npx convex dev` running in a terminal so generated types stay fresh.

## What's inside

| File | Purpose |
| --- | --- |
| `SKILL.md` | Router: load the matching task reference, with guidelines underpinning all Convex code |
| `references/{quickstart,auth,components,migrations,performance}.md` | Task workflows (from get-convex/agent-skills) |
| `references/guidelines.md` | Foundational Convex correctness rules |

## Stays up to date

The `references/` are vendored from Convex's official sources ([get-convex/agent-skills](https://github.com/get-convex/agent-skills) and `convex_rules.txt`) by `scripts/sync.mjs`, run weekly and on demand via **Actions → Sync upstream from Convex**. Each sync commit records the exact upstream commit. Maintenance rules live in `AGENTS.md`.
