import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Contract tests hit the live API; run them via `npm run test:contract`.
    exclude: ["node_modules/**", "dist/**", "tests/contract/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types.ts", "src/constants.ts", "src/data/**"],
    },
  },
});
