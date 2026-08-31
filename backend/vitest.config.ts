import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals:     true,
    environment: "node",
    setupFiles:  ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include:  ["src/**/*.ts"],
      exclude:  ["src/index.ts", "src/config/**"],
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target:               "ES2022",
        module:               "NodeNext",
        moduleResolution:     "NodeNext",
        strict:               true,
        esModuleInterop:      true,
        skipLibCheck:         true,
      },
    },
  },
});
