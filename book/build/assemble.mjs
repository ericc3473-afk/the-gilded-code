#!/usr/bin/env node
// Assembler: build full manuscript HTML from toc.md order, then hand off to
// build.mjs for the Paged.js render.
//
// Usage:  node build/assemble.mjs [--out <name.pdf>]
//   writes build/book.html (then run: node build/build.mjs build/book.html --out <pdf>)
//   with --out <name.pdf>, renders the PDF directly at the project root.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const args = process.argv.slice(2);
const getOpt = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const outPdf = getOpt("--out", null);

const { marked } = await import("marked");

// minimal YAML front matter parse (key: value lines)
function parseYamlHeader(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { header: {}, body: text };
  const header = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) header[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { header, body: text.slice(m[0].length) };
}

// strip kramdown attribute lines ({:.class}); we style via section classes
function stripKramdown(md) {
  return md.replace(/^\{:\.[\w.-]+\}\s*$/gm, "").replace(/\n{3,}/g, "\n\n");
}

// toc.md: one manuscript path per line, comments allowed
const toc = readFileSync(join(root, "manuscript", "toc.md"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("<!--") && l.startsWith("manuscript/"));

const PART_TITLES = {
  I: "The Price of the Mind",
  II: "The Code in Practice",
  III: "Living the Code",
};
const PART_SUBS = {
  I: "Eight laws on what wealth asks of your mind first",
  II: "Ten laws on the daily practice of earning",
  III: "Four laws on conduct across a decade",
};

let out = [];
let seenParts = new Set();

for (const rel of toc) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error("MISSING: " + rel);
    process.exit(1);
  }
  const { header, body: rawBody } = parseYamlHeader(readFileSync(path, "utf8"));
  const type = header.type || "front";
  const body = stripKramdown(rawBody);

  if (type === "cover") {
    out.push(stripKramdown(rawBody).trim()); // raw HTML section, already styled
    continue;
  }
  if (type === "chapter") {
    const part = header.part || "";
    if (PART_TITLES[part] && !seenParts.has(part)) {
      seenParts.add(part);
      out.push(
        `<section class="pb part-divider">\n` +
        `<div class="part-label">Part ${part}</div>\n` +
        `<h2 class="part-title">${PART_TITLES[part]}</h2>\n` +
        `<div class="part-sub">${PART_SUBS[part]}</div>\n` +
        `</section>`
      );
    }
    const kicker =
      header && header.law
        ? `<div class="kicker">Law ${header.law} · Part ${part}</div>\n`
        : "";
    out.push(
      `<section class="pb chapter">\n${kicker}${marked.parse(body).trim()}\n</section>`
    );
    continue;
  }
  if (type === "backmatter") {
    out.push(
      `<section class="pb backmatter">\n${marked.parse(body).trim()}\n</section>`
    );
    continue;
  }
  // front matter (title page, how to use, introduction)
  const cls = rel.endsWith("00-title-page.md") ? "titlepage" : "front";
  out.push(`<section class="pb ${cls}">\n${marked.parse(body).trim()}\n</section>`);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The Gilded Code — Kael Varnow</title>
<link rel="stylesheet" href="../style/book.css">
<link rel="stylesheet" href="../style/cover.css">
<script src="../node_modules/pagedjs/dist/paged.polyfill.js"><\/script>
</head>
<body>
${out.join("\n")}
</body>
</html>
`;

const htmlPath = join(here, "book.html");
writeFileSync(htmlPath, html);
console.log(`assembled ${toc.length} files -> ${htmlPath}`);

if (outPdf) {
  const { renderToPdf } = await import("./build.mjs");
  const dest = join(root, outPdf);
  const n = await renderToPdf(htmlPath, dest);
  console.log("PAGES: " + n);
  console.log("OUT: " + dest);
}
