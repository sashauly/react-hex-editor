import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await mkdir("artifacts", { recursive: true });
execFileSync("npm", ["pack", "--pack-destination", "artifacts"], {
  stdio: "inherit",
});
