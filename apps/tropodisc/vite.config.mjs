import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

import fs from "fs"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))

  const proxy = {}
  if (env.VITE_SET_LEDS === "yes" && env.VITE_AUDIOLIBRARY_URL) {
    proxy["/api/leds"] = {
      target: env.VITE_AUDIOLIBRARY_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/leds/, "/leds"),
    }
    proxy["/api/ping"] = {
      target: env.VITE_AUDIOLIBRARY_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ping/, "/ping"),
    }
    proxy["/api/ruler"] = {
      target: env.VITE_AUDIOLIBRARY_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ruler/, "/ruler"),
    }
  }

  if (env.DISCOGS_TOKEN) {
    const token = env.DISCOGS_TOKEN
    proxy["/api/discogs"] = {
      target: "https://api.discogs.com",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/discogs/, ""),
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": "TropoDisc",
      },
    }
  }

  proxy["/api/discogs-image"] = {
    target: "https://i.discogs.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/discogs-image/, ""),
    headers: {
      "User-Agent": "TropoDisc",
    },
    configure: (proxyServer) => {
      proxyServer.on("proxyRes", (proxyRes) => {
        proxyRes.headers["access-control-allow-origin"] = "*"
      })
    },
  }

  // Image proxy middleware to bypass CORS for client-side ZIP export
  const imageProxyPlugin = {
    name: "image-proxy-plugin",
    configureServer(server) {
      server.middlewares.use("/api/proxy-image", async (req, res) => {
        const targetUrl = new URL(req.url, "http://localhost").searchParams.get(
          "url",
        )

        if (!targetUrl) {
          res.statusCode = 400
          res.end("Missing url parameter")
          return
        }

        try {
          const response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "TropoDisc",
            },
          })

          if (!response.ok) {
            res.statusCode = response.status
            res.end("Failed to fetch image from target server")
            return
          }

          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          res.setHeader("Access-Control-Allow-Origin", "*")
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
          res.setHeader(
            "Content-Type",
            response.headers.get("content-type") || "image/jpeg",
          )
          res.end(buffer)
        } catch (err) {
          res.statusCode = 500
          res.end(`Image proxy error: ${err.message}`)
        }
      })
    },
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [
      imageProxyPlugin,
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "service-worker.js",
        manifest: {
          short_name: "TropoDisc",
          name: "TropoDisc – A universal music collection manager",
          description:
            "Organize your collection, enrich it with your own metadata, and optionally locate albums instantly using LED strips",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
          start_url: "/",
          id: "/",
          display: "standalone",
          theme_color: "#0d0f14",
          background_color: "#0d0f14",
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        },
      }),
    ],
    server: {
      port: 3000,
      proxy: proxy,
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react/") ||
                id.includes("react-dom/") ||
                id.includes("scheduler/") ||
                id.includes("prop-types/")
              ) {
                return "react-core"
              }
              if (id.includes("react-bootstrap") || id.includes("bootstrap")) {
                return "vendor-bootstrap"
              }
              if (id.includes("@fortawesome")) {
                return "vendor-icons"
              }
              return "vendor-others"
            }
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.js",
    },
  }
})
