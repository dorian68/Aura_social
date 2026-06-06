/* Minimal static file server for the Frontend_Aura product UI.
   Zero dependencies. Binds 0.0.0.0 so it's reachable from outside the container.
   Port: WEB_PORT (default 8080). Root: Frontend_Aura/. */
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "Frontend_Aura");
const PORT = Number(process.env.WEB_PORT) || 8080;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.normalize(path.join(root, decoded));
  // prevent path traversal outside ROOT
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  let target = safeJoin(ROOT, req.url === "/" ? "/index.html" : req.url);
  if (!target) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  if (!existsSync(target)) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
  createReadStream(target).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[frontend] Aura product UI served from ${ROOT}`);
  console.log(`[frontend] listening on http://${HOST}:${PORT}`);
});
