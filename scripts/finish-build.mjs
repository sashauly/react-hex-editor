import { cp, mkdir, writeFile } from "node:fs/promises";
import { build } from "vite";
for (const name of ["index", "oneDarkPro"]) {
  await build({
    configFile: false,
    build: {
      outDir: "themes",
      emptyOutDir: false,
      target: "es2018",
      lib: {
        entry: `src/themes/${name}.ts`,
        formats: ["es", "cjs"],
        fileName: (format) => `${name}.${format === "es" ? "mjs" : "js"}`,
      },
    },
  });
}
await mkdir("themes", { recursive: true });
await cp("dist/themes/index.d.ts", "themes/index.d.ts");
await cp("dist/themes/oneDarkPro.d.ts", "themes/oneDarkPro.d.ts");
// React 16's CJS entry has no Node-detectable named exports. This native
// ESM facade shares the CJS instance; module retains the bundler ESM build.
await writeFile('dist/index.mjs', `import editor from './index.js';
export const { BaseHexEditor, UnstyledBaseHexEditor, UnstyledHexEditor } = editor;
export default editor.default;
`);
