import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  build: {
    target: "es2018",
    sourcemap: true,
    lib: {
      entry: "src/index.tsx",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.es.js" : "index.js"),
    },
    rolldownOptions: {
      external: (id) =>
        Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).some(
          (name) => id === name || id.startsWith(`${name}/`),
        ),
      output: { exports: "named" },
    },
  },
});
