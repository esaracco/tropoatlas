const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 8080;
const PUBLIC_ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

// Check if client prefers French based on Accept-Language header.
function prefersFrench(acceptLanguage) {
  if (!acceptLanguage) {
    return false;
  }

  // Parse and sort language tags by quality value q.
  const languages = acceptLanguage
    .split(",")
    .map((entry) => {
      const [code, qVal] = entry.trim().split(";");
      const q =
        qVal && qVal.startsWith("q=") ? parseFloat(qVal.slice(2)) : 1.0;
      return { code: code.toLowerCase(), q: Number.isNaN(q) ? 1.0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const lang of languages) {
    if (lang.code.startsWith("fr")) {
      return true;
    }
    if (lang.code.startsWith("en")) {
      return false;
    }
  }

  return false;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURI((req.url || "/").split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(PUBLIC_ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    // Redirect directories without trailing slash to preserve relative links.
    if (stats.isDirectory()) {
      if (!urlPath.endsWith("/")) {
        res.writeHead(301, { Location: urlPath + "/" });
        res.end();
        return;
      }

      // Auto-detect language entry point for directory roots.
      const defaultFile = prefersFrench(req.headers["accept-language"])
        ? "index-fr.html"
        : "index.html";
      filePath = path.join(filePath, defaultFile);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Set cache headers: private/no-cache for HTML to prevent proxy confusion.
    const headers = { "Content-Type": contentType };
    if (ext === ".html") {
      headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate";
      headers["Vary"] = "Accept-Language";
    } else {
      headers["Cache-Control"] = "public, max-age=86400";
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TropoAtlas static server listening on port ${PORT}`);
});

// Handle graceful shutdown on process termination signals.
const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
