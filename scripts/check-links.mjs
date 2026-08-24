#!/usr/bin/env node
/**
 * Fails on broken relative links and cross-file heading anchors in the repo's
 * markdown. Cross-file anchors are the case that slips through review: the
 * file exists, so a naive check passes, while the heading it points at does
 * not. External http(s) links are not fetched - that would make the check
 * flaky and slow - only local targets are resolved.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

// readdirSync rather than fs.globSync: the latter needs Node 22 and this
// package supports Node 20.
const files = readdirSync(process.cwd())
  .filter((f) => f.endsWith(".md"))
  .sort();

// Mirrors GitHub's heading -> fragment slugification.
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");

const anchorCache = new Map();
function anchorsFor(file) {
  if (!anchorCache.has(file)) {
    const found = new Set();
    for (const m of readFileSync(file, "utf8").matchAll(/^#+\s+(.*)$/gm)) {
      found.add(slug(m[1]));
    }
    anchorCache.set(file, found);
  }
  return anchorCache.get(file);
}

const problems = [];
let checked = 0;

for (const file of files) {
  for (const m of readFileSync(file, "utf8").matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const target = m[2];
    if (/^(https?:|mailto:|#!)/.test(target)) continue;

    const [rawPath, anchor] = target.split("#");
    const resolved = rawPath ? path.resolve(path.dirname(file), rawPath) : path.resolve(file);
    checked++;

    if (!existsSync(resolved)) {
      problems.push(`${file}: missing file -> ${target}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md") && !anchorsFor(resolved).has(anchor)) {
      problems.push(`${file}: missing anchor -> ${target}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Broken links (${problems.length}):`);
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log(`${checked} local links and anchors OK across ${files.length} markdown files`);
