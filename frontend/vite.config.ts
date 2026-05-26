// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
// If the repo path contains an apostrophe (e.g. mosip's inji), run postinstall patch:
//   node scripts/patch-tanstack-apostrophe-imports.mjs
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Allow ngrok / tunnel hostnames (Vite 6+ blocks unknown Host by default).
      allowedHosts: true,
      proxy: {
        "/api/certify": {
          target: "http://localhost:8090",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/certify/, "/v1/certify"),
        },
        "/api/verify": {
          target: "http://localhost:8095",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/verify/, "/v1/verify"),
        },
      },
    },
  },
});
