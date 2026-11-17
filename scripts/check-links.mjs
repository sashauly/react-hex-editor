import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = path.resolve("site-dist");
const base = "/react-hex-editor/";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      ),
    )
  ).flat();
}
const pages = new Map();
for (const file of await files(root)) {
  if (file.endsWith(".html"))
    pages.set(file, new JSDOM(await readFile(file, "utf8")).window.document);
}
let checked = 0;
for (const [file, document] of pages) {
  for (const node of document.querySelectorAll("[href], [src]")) {
    const url = new URL(
      node.getAttribute("href") ?? node.getAttribute("src"),
      `https://example.test${base}${path.relative(root, file)}`,
    );
    if (url.origin !== "https://example.test") continue;
    if (!url.pathname.startsWith(base))
      throw new Error(`${file}: link escapes project base: ${url}`);
    let target = path.join(
      root,
      decodeURIComponent(url.pathname.slice(base.length)),
    );
    if ((await stat(target)).isDirectory())
      target = path.join(target, "index.html");
    await stat(target);
    if (
      // React landing-page anchors are exercised by the browser suite.
      target !== path.join(root, 'index.html') &&
      url.hash &&
      pages.has(target) &&
      !pages.get(target).getElementById(decodeURIComponent(url.hash.slice(1)))
    ) {
      throw new Error(`${file}: missing anchor ${url}`);
    }
    checked++;
  }
}
console.log(
  `Checked ${checked} local links/assets across ${pages.size} HTML pages under ${base}`,
);
