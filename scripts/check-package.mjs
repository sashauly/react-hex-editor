import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const exec = (command, args, cwd = process.cwd()) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
await mkdir("artifacts", { recursive: true });
exec("npm", ["run", "build"]);
const [packed] = JSON.parse(
  exec("npm", [
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    "artifacts",
  ]),
);
const tarball = path.resolve("artifacts", packed.filename);
const verifiedTarball = path.resolve('artifacts', `verified-${packed.shasum}.tgz`);
await cp(tarball, verifiedTarball);
assert(packed.files.some((f) => f.path === "LICENSE"));
assert(
  !packed.files.some((f) => /^(site-dist|site|test|scripts)\//.test(f.path)),
);
for (const name of ["dist/index.es.js", "dist/index.mjs", "dist/index.js"]) {
  const code = await readFile(name, "utf8");
  assert(
    !/react\/jsx(-dev)?-runtime/.test(code),
    `${name} must use classic JSX`,
  );
}
// Isolate all runtime and declaration consumers from producer dependencies.
const versions = process.env.REACT_VERSION
  ? [process.env.REACT_VERSION]
  : ["16.8.6", "16.14.0", "17.0.2", "18.3.1"];
for (const react of versions) {
  const dir = path.resolve(".compat", react);
  await mkdir(dir, { recursive: true });
  const major = react.split(".")[0];
  const types =
    major === "18"
      ? ["18.3.3", "18.3.0"]
      : major === "17"
        ? ["17.0.89", "17.0.26"]
        : ["16.14.68", "16.9.25"];
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        private: true,
        dependencies: {
          "react-hex-editor": `file:${verifiedTarball}`,
          react,
          "react-dom": react,
          "styled-components": "5.3.11",
          "@types/react": types[0],
          "@types/react-dom": types[1],
          "@types/styled-components": "5.1.36",
          "@types/react-window": "1.8.8",
          typescript: "5.6.2",
        },
      },
      null,
      2,
    ),
  );
  exec(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--install-strategy=nested",
    ],
    dir,
  );
  const req = createRequire(path.join(dir, "package.json"));
  const cjs = req("react-hex-editor");
  const esm = JSON.parse(exec(process.execPath, ['--input-type=module', '--eval', `
    import * as editor from 'react-hex-editor';
    import dark from 'react-hex-editor/themes/oneDarkPro';
    import explicit from 'react-hex-editor/themes/oneDarkPro.js';
    import light from 'react-hex-editor/themes';
    import assert from 'node:assert/strict';
    assert.equal(dark.colorBackground, '#282c34');
    assert.equal(explicit.colorBackground, '#282c34');
    assert.equal(light.colorBackground, '#fff');
    console.log(JSON.stringify(Object.fromEntries(Object.keys(editor).map(key => [key, !!editor[key]]))));
  `], dir));
  for (const name of [
    "default",
    "BaseHexEditor",
    "UnstyledBaseHexEditor",
    "UnstyledHexEditor",
  ]) {
    assert(cjs[name], `CJS missing ${name}`);
    assert(esm[name], `ESM missing ${name}`);
  }
  assert.equal(
    req("react-hex-editor/themes/oneDarkPro").colorBackground,
    "#282c34",
  );
  assert.equal(
    req("react-hex-editor/themes/oneDarkPro.js").colorBackground,
    "#282c34",
  );
  const html = req("react-dom/server").renderToString(
    req("react").createElement(cjs.UnstyledBaseHexEditor, {
      data: [0xaa],
      columns: 16,
      rows: 4,
      width: 600,
      height: 80,
      rowHeight: 20,
    }),
  );
  assert(html.includes("byteValue"));
  await cp("test/consumer.tsx", path.join(dir, "consumer.tsx"));
  await cp("site/Example.tsx", path.join(dir, "Example.tsx"));
  await writeFile(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        jsx: "react",
        module: "commonjs",
        moduleResolution: "node",
        target: "ES2018",
        esModuleInterop: true,
        noEmit: true,
        types: ["react", "react-dom"],
      },
      files: ["consumer.tsx", "Example.tsx"],
    }),
  );
  exec(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
    dir,
  );
  console.log(
    `PASS packed CJS/ESM, themes, SSR rendering, TS5.6.2 declarations: React ${react}`,
  );
}
console.log(`Tarball: ${tarball}; npm shasum: ${packed.shasum}`);
