import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load env (root first, then local fallback)
  let env = loadEnv(mode, "../", "");
  if (!env.VITE_DEMO_ONE_PORT) env = loadEnv(mode, "./", "");

  const requiredEnvVars = ["VITE_SHELL_REMOTE_ENTRY", "VITE_DEMO_ONE_PORT"];
  const missing = requiredEnvVars.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ", "
      )}. Please check your .env files.`
    );
  }

  const shellRemoteEntry = env.VITE_SHELL_REMOTE_ENTRY;

  return {
    // IMPORTANT: keep root base so built URLs start with '/'
    base: "/",

    plugins: [
      federation({
        filename: "remoteEntry.js", // will be emitted at site root
        name: "demoOneApp",
        exposes: {
          "./DemoOneCanvas": "./src/components/DemoOneCanvas.vue",
          "./demoOneLogic": "./src/fabric/demoOne.js",
        },
        remotes: {
          shellApp: {
            type: "module",
            name: "shellApp",
            entry: shellRemoteEntry,
            entryGlobalName: "shellApp",
            shareScope: "default",
          },
        },
        shared: {
          vue: { singleton: true },
          fabric: { singleton: true },
        },
      }),
      vue(),
    ],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    optimizeDeps: {
      include: ["fabric"],
    },

    build: {
      outDir: "dist",
      target: "chrome89",
      cssCodeSplit: false,

      // === Key changes: emit everything at the ROOT (no /assets) ===
      assetsDir: "", // place static assets at '/'
      rollupOptions: {
        output: {
          // keep module-federation friendly names at root
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
          manualChunks: undefined,
        },
        external: [],
      },
    },

    server: {
      port: parseInt(env.VITE_DEMO_ONE_PORT),
      cors: true,
      fs: { allow: ["..", "."] },
      allowedHosts: true,
    },

    preview: {
      port: parseInt(env.VITE_DEMO_ONE_PORT),
      cors: true,
      // (optional) if you want a separate preview output path, keep it.
      outDir: "../dist/demo-one-app",
    },
  };
});
