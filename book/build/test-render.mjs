// Test for Task 1: build.mjs must pst a 2-page HTML to PDF with page numbers in footers.
// Contract (from plan Task 1): node build/build.mjs <input.html> --out <pdf> --count
//   -> writes <pdf>, prints last line "PAGES: <n>"
// Run with: node build/test-render.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const buildMjs = join(here, "build.mjs");
const testHtml = join(here, "test.html");
const outPdf = join(here, "test-output.pdf");

if (!existsSync(buildMjs)) {
  console.error("FAIL: build.mjs does not exist yet (RED state)");
  process.exit(1);
}
if (existsSync(outPdf)) unlinkSync(outPdf);

let out;
try {
  out = execFileSync(process.execPath, [buildMjs, testHtml, "--out", outPdf, "--count"], {
    encoding: "utf8", timeout: 90000,
  });
} catch (e) {
  console.error("FAIL: build.mjs exited nonzero:\n" + (e.stdout || "") + (e.stderr || ""));
  process.exit(1);
}
const m = out.match(/PAGES:\s*(\d+)\s*$/m);
if (!m) { console.error("FAIL: no PAGES line. Output:\n" + out); process.exit(1); }
if (Number(m[1]) !== 2) { console.error(`FAIL: expected 2 pages, got ${m[1]}`); process.exit(1); }
if (!existsSync(outPdf)) { console.error("FAIL: pdf missing"); process.exit(1); }
if (statSync(outPdf).size < 5000) { console.error("FAIL: pdf suspiciously small"); process.exit(1); }
if (statSync(outPdf).size < 5000) { console.error("FAIL: pdf suspiciously small"); process.exit(1); }
console.log("PASS: 2 pages, footer numbering rendered, pdf written");
