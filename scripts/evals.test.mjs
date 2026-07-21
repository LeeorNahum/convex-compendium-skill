import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

test("trigger queries are balanced and uniquely identified", async () => {
  const manifest = await readJson("evals/trigger-queries.json");
  assert.equal(manifest.skill_name, "convex-compendium");
  assert.equal(manifest.runs_per_query, 3);
  assert.match(manifest.trigger_evidence, /SKILL\.md/);
  assert.equal(manifest.queries.length, 20);

  const ids = new Set();
  for (const query of manifest.queries) {
    assert.equal(typeof query.id, "string");
    assert.ok(query.id.length > 0);
    assert.equal(ids.has(query.id), false, `duplicate trigger id ${query.id}`);
    ids.add(query.id);
    assert.ok(["train", "validation"].includes(query.split));
    assert.equal(typeof query.query, "string");
    assert.ok(query.query.length > 20);
    assert.equal(typeof query.should_trigger, "boolean");
  }

  for (const split of ["train", "validation"]) {
    const cases = manifest.queries.filter((query) => query.split === split);
    assert.equal(cases.filter((query) => query.should_trigger).length, 5);
    assert.equal(cases.filter((query) => !query.should_trigger).length, 5);
  }
});

test("workflow evaluations have concrete assertions and existing fixtures", async () => {
  const manifest = await readJson("evals/evals.json");
  assert.equal(manifest.skill_name, "convex-compendium");
  assert.equal(manifest.evals.length, 8);

  const ids = new Set();
  for (const evaluation of manifest.evals) {
    assert.equal(
      ids.has(evaluation.id),
      false,
      `duplicate eval id ${evaluation.id}`,
    );
    ids.add(evaluation.id);
    assert.ok(evaluation.prompt.length > 30);
    assert.ok(evaluation.expected_output.length > 40);
    assert.ok(Array.isArray(evaluation.files));
    assert.ok(evaluation.files.length >= 2);
    assert.ok(Array.isArray(evaluation.assertions));
    assert.ok(evaluation.assertions.length >= 4);
    for (const fixture of evaluation.files) {
      assert.match(fixture, /^evals\/files\//);
      await access(path.join(ROOT, fixture));
    }
    const packageFixture = evaluation.files.find((fixture) =>
      fixture.endsWith("package.json"),
    );
    assert.ok(packageFixture, `eval ${evaluation.id} has no package.json`);
    const packageJson = await readJson(packageFixture);
    assert.equal(typeof packageJson.packageManager, "string");
    assert.equal(typeof packageJson.dependencies?.convex, "string");
  }
});

test("the skill does not contain committed eval result workspaces", async () => {
  const forbidden = [
    "evals/benchmark.json",
    "evals/grading.json",
    "evals/timing.json",
    "evals/workspace",
    "convex-compendium-workspace",
  ];
  for (const relativePath of forbidden) {
    await assert.rejects(access(path.join(ROOT, relativePath)), {
      code: "ENOENT",
    });
  }
});
