import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EXCLUDED_SKILLS,
  FROZEN_SKILLS,
  FROZEN_UPSTREAM_COMMIT,
  GENERATED_BANNER,
  LIVE_SKILL_MAP,
  assertNoExecutableInstaller,
  assertSafeExistingFiles,
  buildManifest,
  compareOutputs,
  fetchValidated,
  generate,
  inspectRepository,
  inspectRevision,
  namespaceHeadings,
  neutralizeInstallerCommands,
  normalizeText,
  parseArgs,
  parseSkillSource,
  renderGuidelines,
  renderTaskReference,
  replaceDirectoryAtomic,
  rewriteReferenceLinks,
  sha256,
  stripLeadingH1,
  validateGuidelines,
  validateSkillDecisions,
  validateSourceShape,
  validateTree,
} from "./sync.mjs";

const FULL_SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);

function blobMap(paths) {
  return new Map(
    paths.map((sourcePath, index) => [
      sourcePath,
      `${index}`.padStart(40, "a").slice(-40),
    ]),
  );
}

function headAgentPaths(extra = []) {
  return [
    ...[...LIVE_SKILL_MAP.keys(), ...EXCLUDED_SKILLS.keys()].map(
      (folder) => `skills/${folder}/SKILL.md`,
    ),
    ...extra,
  ];
}

function frozenAgentPaths(extra = []) {
  return [
    ...[...FROZEN_SKILLS.keys()].map((folder) => `skills/${folder}/SKILL.md`),
    ...extra,
  ];
}

const GUIDELINE_BLOBS = () => blobMap(["runner/models/guidelines.md"]);

function response({ url, status = 200, body = "", json = null }) {
  return {
    url,
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Failure",
    text: async () => body,
    json: async () => json,
  };
}

test("parseArgs accepts the documented interface", () => {
  assert.deepEqual(parseArgs([]), {
    check: false,
    help: false,
    agentSkillsSha: null,
    convexEvalsSha: null,
  });
  assert.deepEqual(
    parseArgs([
      "--check",
      "--agent-skills-sha",
      FULL_SHA.toUpperCase(),
      "--convex-evals-sha",
      OTHER_SHA,
    ]),
    {
      check: true,
      help: false,
      agentSkillsSha: FULL_SHA,
      convexEvalsSha: OTHER_SHA,
    },
  );
  assert.equal(parseArgs(["-h"]).help, true);
});

test("parseArgs rejects unknown arguments and incomplete revisions", () => {
  assert.throws(() => parseArgs(["--wat"]), /Unknown argument/);
  assert.throws(() => parseArgs(["positional"]), /Unknown argument/);
  assert.throws(() => parseArgs(["--agent-skills-sha"]), /requires/);
  assert.throws(() => parseArgs(["--convex-evals-sha", "abc"]), /40-character/);
});

test("normalizeText uses LF and one final newline", () => {
  assert.equal(normalizeText("one\r\n\r\ntwo  \r\n"), "one\n\ntwo\n");
});

test("parseSkillSource validates frontmatter and leading H1", () => {
  const body = parseSkillSource(
    "---\r\nname: convex-quickstart\r\ndescription: |\r\n  Useful.\r\n---\r\n\r\n# Quickstart\r\n\r\nBody\r\n",
    "convex-quickstart",
  );
  assert.match(body, /^# Quickstart\n/);
  assert.throws(
    () => parseSkillSource("# Missing frontmatter", "convex-quickstart"),
    /no YAML frontmatter/,
  );
  assert.throws(
    () =>
      parseSkillSource(
        "---\nname: wrong\n---\n# Quickstart\n",
        "convex-quickstart",
      ),
    /mismatched/,
  );
  assert.throws(
    () =>
      parseSkillSource(
        "---\nname: convex-quickstart\n---\nBody\n",
        "convex-quickstart",
      ),
    /begin with an H1/,
  );
});

test("stripLeadingH1 removes only the document title", () => {
  assert.equal(stripLeadingH1("# Title\n\n## Child\n"), "## Child\n");
  assert.throws(() => stripLeadingH1("## Not a title\n"), /begin with an H1/);
});

test("namespaceHeadings demotes prose headings but preserves fenced code", () => {
  const result = namespaceHeadings(
    "# Intro\n\n```md\n# Code heading\n```\n\n## Details\n",
    "reference-guide",
  );
  assert.match(
    result.markdown,
    /<a id="reference-guide-intro"><\/a>\n### Intro/,
  );
  assert.match(result.markdown, /```md\n# Code heading\n```/);
  assert.match(
    result.markdown,
    /<a id="reference-guide-details"><\/a>\n#### Details/,
  );
});

test("rewriteReferenceLinks handles paths, fragments, titles, and inline code", () => {
  const referenceInfo = new Map([
    [
      "guide",
      {
        rootAnchor: "reference-guide",
        anchors: new Map([["details", "reference-guide-details"]]),
      },
    ],
  ]);
  const rewritten = rewriteReferenceLinks(
    '[Guide](./references/guide.md "Title") [Details](references/guide.md#details) `references/guide.md#details`',
    referenceInfo,
  );
  assert.equal(
    rewritten,
    '[Guide](#reference-guide "Title") [Details](#reference-guide-details) [guide section](#reference-guide-details)',
  );
  assert.throws(
    () => rewriteReferenceLinks("[Missing](references/nope.md)", referenceInfo),
    /unknown flattened reference/,
  );
});

test("neutralizeInstallerCommands covers package runners and fences", () => {
  const source = [
    "Run `npx convex ai-files install` now.",
    "",
    "```bash",
    "pnpm dlx convex@latest ai-files install",
    "```",
    "",
    "The ai-files installer exists as a concept.",
  ].join("\n");
  const result = neutralizeInstallerCommands(source);
  assert.equal(result.replaced, true);
  assert.doesNotMatch(result.markdown, /npx convex ai-files install/);
  assert.doesNotMatch(
    result.markdown,
    /pnpm dlx convex@latest ai-files install/,
  );
  assert.match(result.markdown, /installer exists as a concept/);
  assert.doesNotThrow(() => assertNoExecutableInstaller(result.markdown));
  assert.throws(
    () => assertNoExecutableInstaller("bunx convex ai-files install"),
    /executable/,
  );
});

test("inspectRepository accepts a newly detected optional license", async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (/\/repos\/get-convex\/agent-skills$/.test(parsed.pathname)) {
      return response({
        url,
        json: {
          default_branch: "main",
          html_url: "https://github.com/get-convex/agent-skills",
          license: { spdx_id: "Apache-2.0" },
        },
      });
    }
    if (parsed.pathname.includes("/commits/")) {
      return response({ url, json: { sha: FULL_SHA } });
    }
    if (parsed.pathname.includes("/git/trees/")) {
      return response({ url, json: { truncated: false, tree: [] } });
    }
    throw new Error(`Unexpected fake URL ${url}`);
  };

  const snapshot = await inspectRepository(
    {
      name: "get-convex/agent-skills",
      branch: "main",
      expectedLicense: null,
    },
    FULL_SHA,
    fetchImpl,
  );
  assert.equal(snapshot.license, "Apache-2.0");
});

test("validateTree rejects invalid and truncated trees", () => {
  assert.throws(() => validateTree({}, "repo"), /invalid Git tree/);
  assert.throws(
    () => validateTree({ truncated: true, tree: [] }, "repo"),
    /truncated/,
  );
  const blobs = validateTree(
    {
      truncated: false,
      tree: [
        { path: "a.md", type: "blob", sha: FULL_SHA },
        { path: "dir", type: "tree", sha: OTHER_SHA },
      ],
    },
    "repo",
  );
  assert.deepEqual([...blobs], [["a.md", FULL_SHA]]);
});

test("skill decisions are disjoint and every replacement is excluded", () => {
  const outputs = validateSkillDecisions();
  assert.equal(outputs.size, LIVE_SKILL_MAP.size + FROZEN_SKILLS.size);
  assert.equal(outputs.get("components.md"), "convex-create-component");
  assert.equal(outputs.get("auth.md"), "convex-setup-auth");
  assert.match(FROZEN_UPSTREAM_COMMIT, /^[0-9a-f]{40}$/);
  for (const folder of FROZEN_SKILLS.keys()) {
    assert.equal(LIVE_SKILL_MAP.has(folder), false);
  }
  for (const folder of LIVE_SKILL_MAP.keys()) {
    assert.equal(EXCLUDED_SKILLS.has(folder), false);
  }
  assert.ok(EXCLUDED_SKILLS.has("convex"));
  for (const reason of EXCLUDED_SKILLS.values()) {
    assert.ok(reason.length > 20);
  }
});

test("validateSourceShape requires the closed task set and guidelines", () => {
  const valid = validateSourceShape(
    blobMap(
      headAgentPaths([
        "skills/convex-create-component/references/local-components.md",
      ]),
    ),
    blobMap(
      frozenAgentPaths(["skills/convex-setup-auth/references/clerk.md"]),
    ),
    GUIDELINE_BLOBS(),
  );
  assert.deepEqual(valid.get("convex-create-component").references, [
    "skills/convex-create-component/references/local-components.md",
  ]);
  assert.equal(valid.get("convex-create-component").frozen, null);
  assert.deepEqual(valid.get("convex-setup-auth").references, [
    "skills/convex-setup-auth/references/clerk.md",
  ]);
  assert.equal(valid.get("convex-setup-auth").output, "auth.md");
  assert.equal(
    valid.get("convex-setup-auth").frozen.commit,
    FROZEN_UPSTREAM_COMMIT,
  );
  assert.deepEqual(valid.get("convex-setup-auth").frozen.replacedBy, [
    "convex-auth",
  ]);

  assert.throws(
    () =>
      validateSourceShape(
        blobMap(
          headAgentPaths().filter(
            (value) => !value.includes("create-component"),
          ),
        ),
        blobMap(frozenAgentPaths()),
        GUIDELINE_BLOBS(),
      ),
    /missing: convex-create-component/,
  );
  assert.throws(
    () =>
      validateSourceShape(
        blobMap(headAgentPaths(["skills/convex-new-task/SKILL.md"])),
        blobMap(frozenAgentPaths()),
        GUIDELINE_BLOBS(),
      ),
    /requires review: convex-new-task/,
  );
  assert.throws(
    () =>
      validateSourceShape(
        blobMap(headAgentPaths(["skills/convex-setup-auth/SKILL.md"])),
        blobMap(frozenAgentPaths()),
        GUIDELINE_BLOBS(),
      ),
    /reappeared and requires review: convex-setup-auth/,
  );
  assert.throws(
    () =>
      validateSourceShape(
        blobMap(headAgentPaths()),
        blobMap(
          frozenAgentPaths().filter((value) => !value.includes("setup-auth")),
        ),
        GUIDELINE_BLOBS(),
      ),
    /missing at [0-9a-f]{40}: convex-setup-auth/,
  );
  assert.throws(
    () =>
      validateSourceShape(
        blobMap(headAgentPaths()),
        blobMap(
          frozenAgentPaths([
            "skills/convex-setup-auth/references/nested/provider.md",
          ]),
        ),
        GUIDELINE_BLOBS(),
      ),
    /one-level Markdown references/,
  );
  assert.throws(
    () =>
      validateSourceShape(
        blobMap(headAgentPaths()),
        blobMap(frozenAgentPaths()),
        blobMap([]),
      ),
    /missing: runner\/models\/guidelines\.md/,
  );
});

test("inspectRevision rejects a pin that resolves elsewhere", async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/commits/")) {
      return response({ url, json: { sha: FULL_SHA } });
    }
    throw new Error(`Unexpected fake URL ${url}`);
  };
  await assert.rejects(
    inspectRevision(
      { name: "get-convex/agent-skills", branch: "main" },
      OTHER_SHA,
      fetchImpl,
    ),
    /unexpected commit/,
  );
});

test("validateGuidelines extracts the declared Convex range", () => {
  const guidelines = `# Convex guidelines\n\nThese guidelines target Convex \`^1.41.0\`.\n\n## Function guidelines\n\nSchema authentication query mutation action.\n`;
  assert.equal(validateGuidelines(guidelines), "^1.41.0");
  assert.throws(
    () => validateGuidelines(guidelines.replace("authentication", "identity")),
    /authentication/,
  );
});

test("renderTaskReference flattens references and rewrites links", () => {
  const output = renderTaskReference({
    folder: "convex-setup-auth",
    skillBody:
      "---\nname: convex-setup-auth\ndescription: Auth.\n---\n# Setup Auth\n\nRead [Clerk](references/clerk.md#details).\n",
    references: [
      {
        path: "skills/convex-setup-auth/references/clerk.md",
        body: "# Clerk\n\n## Details\n\nRun `npx convex ai-files install`.\n",
      },
    ],
  });
  assert.ok(output.startsWith(GENERATED_BANNER));
  assert.match(output, /\[Clerk\]\(#reference-clerk-details\)/);
  assert.match(output, /<a id="reference-clerk"><\/a>/);
  assert.doesNotMatch(output, /npx convex ai-files install/);
  assert.match(output, /tree\/main\/skills\/convex-setup-auth>/);
  assert.doesNotMatch(output, /Frozen on/);
});

test("renderTaskReference links the pinned commit and notice for frozen skills", () => {
  const output = renderTaskReference({
    folder: "convex-setup-auth",
    skillBody:
      "---\nname: convex-setup-auth\ndescription: Auth.\n---\n# Setup Auth\n\nBody.\n",
    references: [],
    frozen: {
      commit: FROZEN_UPSTREAM_COMMIT,
      frozenOn: "2026-08-25",
      replacedBy: ["convex-auth"],
    },
  });
  assert.ok(output.startsWith(GENERATED_BANNER));
  assert.match(
    output,
    new RegExp(`tree/${FROZEN_UPSTREAM_COMMIT}/skills/convex-setup-auth>`),
  );
  assert.match(
    output,
    new RegExp(`> Frozen on 2026-08-25 at upstream commit ${FROZEN_UPSTREAM_COMMIT}`),
  );
  assert.match(output, /generated `convex-auth` procedure/);
  assert.match(output, /already bundled in this skill/);
  assert.equal((output.match(/^# /gm) ?? []).length, 1);
});

test("renderGuidelines keeps one document title", () => {
  const guidelines = `# Convex guidelines\n\nThese guidelines target Convex \`^1.41.0\`.\n\n## Function guidelines\n\nSchema authentication query mutation action.\n`;
  const rendered = renderGuidelines(guidelines);
  assert.equal((rendered.match(/^# /gm) ?? []).length, 1);
  assert.match(rendered, /# Convex Guidelines/);
});

test("fetchValidated rejects an unexpected redirect host", async () => {
  await assert.rejects(
    fetchValidated("https://api.github.com/repos/example/repo", {
      expectedHost: "api.github.com",
      fetchImpl: async () =>
        response({ url: "https://example.com/redirect", body: "ok" }),
    }),
    /unexpected host example.com/,
  );
});

test("buildManifest is stable and excludes moving commit SHAs", () => {
  const markdownOutputs = new Map([
    ["components.md", "content\n"],
    ["auth.md", "frozen content\n"],
  ]);
  const manifest = buildManifest({
    agentSnapshot: {
      name: "get-convex/agent-skills",
      url: "https://github.com/get-convex/agent-skills",
      defaultBranch: "main",
      license: null,
      sha: FULL_SHA,
    },
    evalSnapshot: {
      name: "get-convex/convex-evals",
      url: "https://github.com/get-convex/convex-evals",
      defaultBranch: "main",
      license: "Apache-2.0",
      sha: OTHER_SHA,
    },
    targetRange: "^1.41.0",
    consumedSources: [
      {
        repository: "get-convex/agent-skills",
        path: "skills/convex-create-component/SKILL.md",
        pinnedCommit: null,
        blobSha: FULL_SHA,
        body: "source\n",
      },
      {
        repository: "get-convex/agent-skills",
        path: "skills/convex-setup-auth/SKILL.md",
        pinnedCommit: FROZEN_UPSTREAM_COMMIT,
        blobSha: FULL_SHA,
        body: "frozen source\n",
      },
    ],
    outputSources: new Map([
      ["components.md", ["skills/convex-create-component/SKILL.md"]],
      ["auth.md", ["skills/convex-setup-auth/SKILL.md"]],
    ]),
    markdownOutputs,
  });
  assert.equal(manifest, normalizeText(manifest));
  assert.doesNotMatch(manifest, new RegExp(OTHER_SHA));
  assert.match(manifest, new RegExp(sha256("content\n")));
  assert.equal(manifest, manifest.replace(/\r/g, ""));

  const parsed = JSON.parse(manifest);
  assert.equal(parsed.formatVersion, 2);
  assert.deepEqual(parsed.taskSkills.mapped, Object.fromEntries(LIVE_SKILL_MAP));
  assert.equal(
    parsed.taskSkills.frozen["convex-setup-auth"].pinnedCommit,
    FROZEN_UPSTREAM_COMMIT,
  );
  assert.equal(parsed.taskSkills.frozen["convex-setup-auth"].output, "auth.md");
  assert.deepEqual(parsed.taskSkills.frozen["convex-setup-auth"].replacedBy, [
    "convex-auth",
  ]);
  assert.equal(typeof parsed.taskSkills.excluded.convex, "string");
  const live = parsed.sources.find((source) =>
    source.path.includes("create-component"),
  );
  const frozen = parsed.sources.find((source) =>
    source.path.includes("setup-auth"),
  );
  assert.equal("pinnedCommit" in live, false);
  assert.equal(frozen.pinnedCommit, FROZEN_UPSTREAM_COMMIT);
});

test("compareOutputs separates missing, changed, and stale files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "convex-sync-compare-"));
  try {
    await writeFile(path.join(root, "changed.md"), "old\n");
    await writeFile(path.join(root, "stale.md"), "stale\n");
    const diff = await compareOutputs(
      new Map([
        ["missing.md", "new\n"],
        ["changed.md", "new\n"],
      ]),
      root,
    );
    assert.deepEqual(diff, {
      missing: ["missing.md"],
      changed: ["changed.md"],
      stale: ["stale.md"],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("assertSafeExistingFiles rejects unexpected directories", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "convex-sync-safety-"));
  const target = path.join(parent, "references");
  try {
    await mkdir(path.join(target, "notes"), { recursive: true });
    await assert.rejects(
      assertSafeExistingFiles(
        new Map([["quickstart.md", "generated\n"]]),
        target,
        null,
      ),
      /unrecognized reference entry: notes/,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("replaceDirectoryAtomic installs a complete output set", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "convex-sync-replace-"));
  const target = path.join(parent, "references");
  try {
    await mkdir(target);
    await writeFile(path.join(target, "old.md"), "old\n");
    await replaceDirectoryAtomic(
      target,
      new Map([
        ["new.md", "new\n"],
        ["source-manifest.json", "{}\n"],
      ]),
    );
    assert.equal(await readFile(path.join(target, "new.md"), "utf8"), "new\n");
    await assert.rejects(readFile(path.join(target, "old.md"), "utf8"), {
      code: "ENOENT",
    });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("replaceDirectoryAtomic rolls back when the swap fails", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "convex-sync-rollback-"));
  const target = path.join(parent, "references");
  const fs = await import("node:fs/promises");
  let swapFailed = false;
  try {
    await mkdir(target);
    await writeFile(path.join(target, "old.md"), "old\n");
    const fsApi = {
      mkdir: fs.mkdir,
      writeFile: fs.writeFile,
      rm: fs.rm,
      rename: async (from, to) => {
        if (
          !swapFailed &&
          from.includes(".references-sync-") &&
          to === target
        ) {
          swapFailed = true;
          const error = new Error("simulated swap failure");
          error.code = "EACCES";
          throw error;
        }
        return fs.rename(from, to);
      },
    };
    await assert.rejects(
      replaceDirectoryAtomic(target, new Map([["new.md", "new\n"]]), fsApi),
      /simulated swap failure/,
    );
    assert.equal(await readFile(path.join(target, "old.md"), "utf8"), "old\n");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("generate fails before writing when a later source fetch fails", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "convex-sync-failure-"));
  const target = path.join(parent, "references");
  const toTree = (paths) =>
    paths.map((sourcePath, index) => ({
      path: sourcePath,
      type: "blob",
      sha: `${index}`.padStart(40, "a").slice(-40),
    }));
  const agentTree = toTree(headAgentPaths());
  const frozenTree = toTree(frozenAgentPaths());
  const evalTree = [
    { path: "runner/models/guidelines.md", type: "blob", sha: OTHER_SHA },
  ];

  const fakeFetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "raw.githubusercontent.com") {
      return response({ url, status: 503, body: "source unavailable" });
    }
    if (/\/repos\/get-convex\/agent-skills$/.test(parsed.pathname)) {
      return response({
        url,
        json: {
          default_branch: "main",
          html_url: "https://github.com/get-convex/agent-skills",
          license: null,
        },
      });
    }
    if (/\/repos\/get-convex\/convex-evals$/.test(parsed.pathname)) {
      return response({
        url,
        json: {
          default_branch: "main",
          html_url: "https://github.com/get-convex/convex-evals",
          license: { spdx_id: "Apache-2.0" },
        },
      });
    }
    if (parsed.pathname.includes("/commits/")) {
      const sha = parsed.pathname.includes(FROZEN_UPSTREAM_COMMIT)
        ? FROZEN_UPSTREAM_COMMIT
        : parsed.pathname.includes("agent-skills")
          ? FULL_SHA
          : OTHER_SHA;
      return response({ url, json: { sha } });
    }
    if (parsed.pathname.includes(`agent-skills/git/trees/${FROZEN_UPSTREAM_COMMIT}`)) {
      return response({ url, json: { truncated: false, tree: frozenTree } });
    }
    if (parsed.pathname.includes("agent-skills/git/trees")) {
      return response({ url, json: { truncated: false, tree: agentTree } });
    }
    if (parsed.pathname.includes("convex-evals/git/trees")) {
      return response({ url, json: { truncated: false, tree: evalTree } });
    }
    throw new Error(`Unexpected fake URL ${url}`);
  };

  try {
    await assert.rejects(
      generate({
        agentSkillsSha: FULL_SHA,
        convexEvalsSha: OTHER_SHA,
        fetchImpl: fakeFetch,
        referenceDir: target,
      }),
      /503 Failure/,
    );
    await assert.rejects(readFile(path.join(target, "quickstart.md"), "utf8"), {
      code: "ENOENT",
    });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
