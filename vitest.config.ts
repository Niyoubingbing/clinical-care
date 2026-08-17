import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig paths: "@/*" -> repo root
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: ["vitest"],
      },
    },
    deps: {
      optimizer: {
        ssr: {
          include: ["@vitest/runner", "vitest", "@vitest/expect", "@vitest/utils"],
        },
      },
    },
  },
});
