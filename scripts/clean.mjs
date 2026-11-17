import { rm } from "node:fs/promises";
for (const path of ["dist", "themes"])
  await rm(path, { recursive: true, force: true });
