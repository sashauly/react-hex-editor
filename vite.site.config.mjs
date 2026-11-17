import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "site",
  base: "/react-hex-editor/",
  plugins: [react({ jsxRuntime: "classic" })],
  resolve: {
    alias: [
      {
        find: "react-hex-editor/themes/oneDarkPro",
        replacement: fileURLToPath(
          new URL("./src/themes/oneDarkPro.ts", import.meta.url),
        ),
      },
      {
        find: "react-hex-editor",
        replacement: fileURLToPath(new URL("./src/index.tsx", import.meta.url)),
      },
    ],
  },
  build: { outDir: "../site-dist", emptyOutDir: true },
});
