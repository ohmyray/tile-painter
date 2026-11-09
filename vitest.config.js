import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      // Symbol rendering is the changed surface; untouched legacy painters are
      // excluded so their zero coverage does not mask this feature's quality.
      include: [
        "src/text.js",
        "src/text-utils.js",
        "src/icons.js",
        "src/labeler.js",
        "src/symbol-geometry.js",
      ],
      reporter: ["text"],
      reportsDirectory: "./node_modules/.vitest-coverage",
      clean: false,
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 95,
        lines: 90,
      },
    },
  },
});
