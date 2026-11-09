#!/usr/bin/env node
// Lint manuscript for AI-tell patterns and accidental corruption.
// Usage: node build/pattern-lint.mjs [dirOrFile ...]
// Exits 1 if any hard violation; prints findings grouped by rule.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const rules = [
  // hard: em/en dashes as connectors (§8); excluded in headings/blockquotes below
  { id: "dash", re: /—|–/ },
  // hard: stock AI words anywhere (§12)
  { id: "stock", re: /\b(delve|tapestry|testament|underscore[sd]?|pivotal|crucial|intricate[ly]?|meticulous(ly)?|landscape|showcas(e|ing)|garner|bolstered|interplay|vibrant|enduring|enduring legacy|groundbreaking|breathtaking|stunning|must-visit|nestled)\b/i },
  // hard: staged openers (§4) and chatbot residue (§22)
  { id: "staging", re: /\b(let'?s dive|let'?s explore|let'?s break (it|this) down|here'?s the thing|without further ado|great question|i hope this helps|of course!|certainly!|reading? that again|sink in)\b/i },
  // hard: not-X-but-Y family (§1)
  { id: "nxb", re: /\b(not (just|only|merely) [a-z ]+(,| but)|it'?s not [a-z ]+, it'?s)\b/i },
  // hard: inflatable connective -ing riders (§15)
  { id: "ing-rider", re: /\b(underscoring|highlighting|reflecting the importance|serving as|standing as)\b/i },
  // hard: mysticism gate (spec constraint)
  { id: "mystic", re: /\b(formless|universe|manifest(ation|s)?|vibration|alchemy)\b/i },
  // hard: modern third-party names (public-domain-only rule)
  { id: "thirdparty", re: /\b(covey|robbins|kieosaki|kiyosaki|ramit|naval|goggins|ferriss|pav|grant cardone|elon|kardashian|pod|app store|instagram|tiktok|cryptocurrency|crypto|nft)\b/i },
  // suspect tokens that show accidental corruption
  { id: "corrupt", re: /\bWRAPPER|medecine|contructive|\bthe the\b|\bthey they\b|do this now now\b|\bний\b/i },
  // stray non-ASCII outside an allowlist of intended accented letters
  { id: "nonascii", re: /[^\x00-\x7F]/ },
];

const asciiAllow = new Set(["é", "è", "ü"]);

function files(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const p = join(root, entry);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.md$/.test(entry)) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const targets = args.length ? args
  : ["manuscript/front", "manuscript/part1", "manuscript/part2", "manuscript/part3", "manuscript/back"];
let bad = 0;
for (const t of targets.flatMap((x) => {
  try { if (statSync(x).isDirectory()) return files(x); } catch { return []; }
  return [x];
})) {
  const text = readFileSync(t, "utf8");
  for (const rule of rules) {
    if (!rule.re) continue;
    const hits = text.match(rule.re) || [];
    if (hits.length) {
      // whitelist: course-title/front matter may quote a banned word inside
      // markup fences or meta lines; count only outside those
      const noMeta = text
        .split("\n")
        .filter((ln) => !ln.startsWith(">") && !ln.startsWith("#") && !/^type:|^---|^law:|^part:|^opener:|^title:/.test(ln))
        .join("\n");
      const body = noMeta.match(rule.re) || [];
      if (rule.id === "nonascii") {
        const stray = [...new Set(body.filter((c) => !asciiAllow.has(c)))];
        if (stray.length) { bad += stray.length; console.log(`${t}: ${rule.id}: ${stray.join(" ")}`); }
        continue;
      }
      if (body.length) { bad += body.length; console.log(`${t}: ${rule.id} x${body.length}`); }
    }
  }
}
console.log(bad ? `FAIL: ${bad} pattern hit(s)` : "PASS: no banned patterns");
process.exit(bad ? 1 : 0);
