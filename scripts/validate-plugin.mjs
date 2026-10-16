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
}

if (errors.length > 0) {
  console.error(errors.map((e) => `error: ${e}`).join("\n"));
  process.exit(1);
}
console.log(`validate-plugin: OK (${skillDirs.length} skills, ${droidFiles.length} droids)`);
