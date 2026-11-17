import { build } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile, cp } from "node:fs/promises";
import path from "node:path";

const version = process.env.REACT_VERSION || "18.3.1";
const fixture = path.resolve(".compat", version);
const modules = path.join(fixture, "node_modules");
const legacy = !version.startsWith("18.");
if (legacy) {
  await writeFile(
    path.join(fixture, "mount.tsx"),
    `import React from 'react';
import ReactDOM from 'react-dom';
import App from ${JSON.stringify(path.resolve("site/App.tsx"))};
ReactDOM.render(<App />, document.getElementById('root'));
`,
  );
}
await build({
  configFile: false,
  root: "site",
  base: "/react-hex-editor/",
  plugins: [react({ jsxRuntime: "classic" })],
  resolve: {
    alias: [
      ...(legacy
        ? [{ find: "./mount", replacement: path.join(fixture, "mount.tsx") }]
        : []),
      {
        find: "react-hex-editor/themes/oneDarkPro",
        replacement: path.join(
          modules,
          "react-hex-editor/themes/oneDarkPro.mjs",
        ),
      },
      {
        find: "react-hex-editor",
        replacement: path.join(modules, "react-hex-editor/dist/index.es.js"),
      },
      { find: "react-dom", replacement: path.join(modules, "react-dom") },
      { find: "react", replacement: path.join(modules, "react") },
      {
        find: "styled-components",
        replacement: path.join(modules, "styled-components"),
      },
    ],
    dedupe: ["react", "react-dom", "styled-components"],
  },
  build: { outDir: path.join(fixture, "browser"), emptyOutDir: true },
});
console.log(
  `Browser fixture uses packed react-hex-editor with React ${version}; StrictMode root: ${!legacy}`,
);

if (!legacy) await cp('site-dist/api', path.join(fixture, 'browser/api'), { recursive: true });
