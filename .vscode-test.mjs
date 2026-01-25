import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/suite/**/*.test.ts",
  mocha: {
    ui: "tdd",
    timeout: 20000,
  },
});
