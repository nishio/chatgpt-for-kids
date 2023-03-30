import { defineConfig } from "astro/config";
import unocss from "unocss/astro";
import solidJs from "@astrojs/solid-js";
import { VitePWA } from "vite-plugin-pwa";
import vercel from "@astrojs/vercel/edge";
import vercelDisableBlocks from "./plugins/vercelDisableBlocks";
// import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  integrations: [unocss(), solidJs()],
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [
      process.env.OUTPUT === "vercel" && vercelDisableBlocks(),
      process.env.OUTPUT === "netlify" && vercelDisableBlocks(),
      process.env.OUTPUT !== "netlify" &&
        VitePWA({
          registerType: "autoUpdate",
          manifest: {
            name: "ChatGPT-API Demo",
            short_name: "ChatGPT Demo",
            description: "A demo repo based on OpenAI API",
            theme_color: "#212129",
            background_color: "#ffffff",
            icons: [
              {
                src: "pwa-192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "pwa-512.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "icon.svg",
                sizes: "32x32",
                type: "image/svg",
                purpose: "any maskable",
              },
            ],
          },
          workbox: {
            globDirectory: "dist",
            navigateFallback: "/",
          },
          client: {
            installPrompt: true,
            periodicSyncForUpdates: 20,
          },
          devOptions: {
            enabled: true,
          },
        }),
    ],
  },
});
