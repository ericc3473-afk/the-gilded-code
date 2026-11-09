#!/usr/bin/env node
// Build: assemble manuscript markdown -> HTML -> Paged.js PDF via headless Edge.
// Usage: node build/build.mjs <input.html> --out <result.pdf> [--count]
//
// Pagination strategy: Paged.js CSS Paged Media (margin boxes give page
// numbers as real DOM content, so Chromium print captures them). Fallback
// (if margin boxes ever fail in headless print): Chromium displayHeaderFooter.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getOpt = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const here = dirname(fileURLToPath(import.meta.url));
const input = args[0] && !args[0].startsWith("--") ? args[0] : null;
const outPdf = getOpt("--out", join(here, "test-output.pdf"));

const PAGE = { width: "152.4mm", height: "228.6mm" };

export async function renderToPdf(htmlPath, outPath, screenshotPath = null) {
  const { default: puppeteer } = await import("puppeteer-core");
  // build the full HTML that Paged.js paginates, then print the paginated DOM
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    // Paged.js fetches <link rel="stylesheet"> via XHR, which file:// blocks
    // (CORS). Inline every local stylesheet into a temp copy first.
    let html = readFileSync(htmlPath, "utf8");
    const root = dirname(resolve(htmlPath));
    html = html.replace(/<link\s+rel="stylesheet"\s+href="([^">]+)"\s*>/g,
      (full, href) => {
        const cssPath = join(root, href);
        if (!existsSync(cssPath)) return full;
        return "<style>\n" + readFileSync(cssPath, "utf8") + "\n</style>";
      });
    // relative scripts broke in the tmp dir; point them at absolute file URLs
    html = html.replace(/<script\s+src="([^">]+)"\s*><\/script>/g,
      (full, src) => {
        if (/^https?:/.test(src)) return full;
        const jsPath = join(root, src);
        return '<script src="file:///' + jsPath.replace(/\\/g, "/") + '"></script>';
      });
    mkdirSync(join(here, "tmp"), { recursive: true });
    const tmpPath = join(here, "tmp", "paged-" + Date.now() + ".html");
    writeFileSync(tmpPath, html);
    await page.goto("file:///" + resolve(tmpPath).replace(/\\/g, "/"), {
      waitUntil: "networkidle0", timeout: 120000,
    });
    // wait for paged.js to finish
    await page.waitForFunction(
      () => document.querySelector(".pagedjs_pages") && document.querySelectorAll(".pagedjs_page").length > 0,
      { timeout: 120000 }
    );
    // paged.js keeps re-flowing; wait until stable
    await page.waitForFunction(
      () => {
        const n = document.querySelectorAll(".pagedjs_page").length;
        if (window.__pg === n && n > 0) return true;
        window.__pg = n; return false;
      },
      { polling: 250, timeout: 120000 }
    );
    const pageCount = await page.evaluate(() => {
      const pages = document.querySelectorAll(".pagedjs_page");
      // hide pagedjs chrome so print isn't polluted
      return pages.length;
    });
    if (screenshotPath) {
      const first = await page.$(".pagedjs_page");
      if (first) {
        await first.screenshot({ path: screenshotPath });
      } else {
        console.error("WARN: no .pagedjs_page element found for screenshot");
      }
    }
    await page.pdf({
      path: outPath,
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      generateDocumentOutline: true, // PDF bookmarks from h1/h2 headings
      tagged: true, // outline generation reads the accessibility tree
    });
    return pageCount;
  } finally {
    await browser.close();
  }
}

// CLI mode: only when executed directly, not when imported as a module.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  (async () => {
    if (!input || !existsSync(input)) {
      console.error("usage: node build.mjs <input.html> --out <pdf> [--count]");
      process.exit(2);
    }
    const pages = await renderToPdf(input, outPdf);
    console.log("PAGES: " + pages);
    console.log("OUT: " + outPdf);
  })();
}
