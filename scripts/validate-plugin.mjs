#!/usr/bin/env node
// Repo consistency checks for the droid-pstack plugin. Run from the repo
// root: node scripts/validate-plugin.mjs. Exits nonzero and lists every
// violation. Checks the root and .factory-plugin manifests stay in sync,
// the marketplace self-listing is intact, every skill directory carries a
// SKILL.md whose frontmatter name matches the directory, and every droid
// carries frontmatter whose name matches its file.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const errors = [];
const fail = (msg) => errors.push(msg);

// Manifests.
const rootManifest = JSON.parse(readFileSync("plugin.json", "utf8"));
const droidManifest = JSON.parse(
  readFileSync(".factory-plugin/plugin.json", "utf8")
);
const marketplace = JSON.parse(
  readFileSync(".factory-plugin/marketplace.json", "utf8")
);

if (
  rootManifest.$schema !==
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
) {
  fail("plugin.json $schema must be https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
}
const namePattern = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
for (const manifest of [rootManifest, droidManifest]) {
  if (!namePattern.test(manifest.name ?? "")) {
    fail(`plugin manifest has invalid name "${manifest.name}"`);
  }
}
const allowedDroidKeys = new Set([
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
]);
for (const key of Object.keys(droidManifest)) {
  if (!allowedDroidKeys.has(key)) {
    fail(`.factory-plugin/plugin.json contains unsupported key "${key}"`);
  }
}
for (const field of ["name", "version", "description"]) {
  if (!droidManifest[field] || typeof droidManifest[field] !== "string") {
    fail(`.factory-plugin/plugin.json missing string field "${field}"`);
    continue;
  }
  if (rootManifest[field] !== droidManifest[field]) {
    fail(
      `Manifest mismatch for "${field}": plugin.json="${rootManifest[field]}" vs .factory-plugin/plugin.json="${droidManifest[field]}"`
    );
  }
}

// Marketplace self-listing.
if (marketplace.name !== "droid-pstack") {
  fail(`marketplace.json name must be "droid-pstack", got "${marketplace.name}"`);
}
const entry = (marketplace.plugins ?? []).find((p) => p.name === "pstack");
if (!entry) {
  fail("marketplace.json must list plugin pstack");
} else if (entry.source !== "./") {
  fail(`marketplace.json pstack source must be "./", got "${entry.source}"`);
}

// Frontmatter helper.
const parseFrontmatter = (filePath) => {
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(`${filePath}: missing YAML frontmatter`);
    return null;
  }
  return match[1];
};
const fmField = (fm, key) =>
  fm?.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();

const frontmatterKeys = (fm) =>
  [...(fm ?? "").matchAll(/^([A-Za-z][\w-]*):/gm)].map((m) => m[1]);

// Droid strips skill frontmatter keys outside its schema, so a key such as
// a Cursor `paths` glob silently stops doing anything. icon and color are
// kept for parity with upstream and are ignored by Droid.
const allowedSkillKeys = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
  "version",
  "tools",
  "enabled",
  "user-invocable",
  "disable-model-invocation",
  "icon",
  "color",
]);
const allowedDroidFrontmatterKeys = new Set([
  "name",
  "description",
  "model",
  "reasoningEffort",
  "tools",
  "mcpServers",
]);

// Skills: frontmatter name must match the directory.
const skillDirs = readdirSync("skills", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const dir of skillDirs) {
  const skillFile = join("skills", dir, "SKILL.md");
  if (!existsSync(skillFile)) {
    fail(`${skillFile}: missing SKILL.md`);
    continue;
  }
  const fm = parseFrontmatter(skillFile);
  if (!fm) continue;
  const name = fmField(fm, "name");
  if (name !== dir) {
    fail(`${skillFile}: frontmatter name "${name}" does not match directory "${dir}"`);
  }
  if (!fmField(fm, "description")) {
    fail(`${skillFile}: frontmatter description is required`);
  }
  for (const key of frontmatterKeys(fm)) {
    if (!allowedSkillKeys.has(key)) {
      fail(`${skillFile}: frontmatter key "${key}" is not read by Droid (see COMPATIBILITY.md)`);
    }
  }
}

// Droids: frontmatter name must match the file, effort values stay in range.
const droidFiles = readdirSync("droids").filter((f) => f.endsWith(".md"));
for (const file of droidFiles) {
  const filePath = join("droids", file);
  const fm = parseFrontmatter(filePath);
  if (!fm) continue;
  const name = fmField(fm, "name");
  if (name !== basename(file, ".md")) {
    fail(`${filePath}: frontmatter name "${name}" does not match file "${basename(file, ".md")}"`);
  }
  if (!fmField(fm, "description")) {
    fail(`${filePath}: frontmatter description is required`);
  }
  const effort = fmField(fm, "reasoningEffort");
  if (effort && !["low", "medium", "high", "xhigh", "max"].includes(effort)) {
    fail(`${filePath}: invalid reasoningEffort "${effort}"`);
  }
  const model = fmField(fm, "model");
  if (model && !namePattern.test(model)) {
    fail(`${filePath}: invalid model id "${model}"`);
  }
  for (const key of frontmatterKeys(fm)) {
    if (!allowedDroidFrontmatterKeys.has(key)) {
      fail(`${filePath}: frontmatter key "${key}" is not a Droid droid field (see COMPATIBILITY.md)`);
    }
  }
}

// Shipped prose and droids must not name Cursor-only surfaces or Task
// fields Droid does not have. Each entry is one rule in COMPATIBILITY.md.
const forbidden = [
  [/run_in_background/, "Droid's Task has no run_in_background field; every Task already runs in the background"],
  [/\bAsk(User)?Question\b/, "use AskUser"],
  [/\bgeneralPurpose\b/, "use the built-in worker droid"],
  [/~\/\.cursor\b|(^|[\s`(])\.cursor\//, "use the ~/.factory or .factory path"],
  [/\.cursor-plugin/, "use .factory-plugin"],
  [/\bis_background:/, "Droid droids have no is_background field"],
  [/\bnode skills\//, "script paths are relative to the skill directory, not the user's repository"],
  [/sub-coordinator/i, "a Droid subagent cannot spawn workers, so the coordinator drains every area itself"],
];
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return d.name === "node_modules" ? [] : walk(p);
    return p.endsWith(".md") ? [p] : [];
  });
const shipped = ["skills", "droids", "docs", "automations"].flatMap(walk).concat("README.md");
for (const file of shipped) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [pattern, fix] of forbidden) {
      if (pattern.test(line)) fail(`${file}:${i + 1}: ${fix} (see COMPATIBILITY.md)`);
    }
  });
}

if (errors.length > 0) {
  console.error(errors.map((e) => `error: ${e}`).join("\n"));
  process.exit(1);
}
console.log(`validate-plugin: OK (${skillDirs.length} skills, ${droidFiles.length} droids)`);
