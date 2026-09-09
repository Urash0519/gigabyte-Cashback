import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const staticRoot = fileURLToPath(new URL("./cloudrun-dist", import.meta.url));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };

export function createUatServer(root = staticRoot) {
  const base = resolve(root);
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; connect-src 'self'");
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      // /healthz is reserved by the Cloud Run frontend.
      if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok", application: "gigabyte-cashback", version: "3.0.0", mode: "internal-uat", integrations: "simulated" }));
        return;
      }
      if (pathname.includes("\0") || pathname.split("/").some(p => p.startsWith(".")) || pathname.startsWith("/api/")) { res.writeHead(404); res.end("Not found"); return; }
      let file = resolve(base, "." + (pathname === "/" ? "/index.html" : pathname));
      if (!file.startsWith(base + sep)) { res.writeHead(404); res.end("Not found"); return; }
      try { if (!(await stat(file)).isFile()) throw new Error("Not a file"); }
      catch { if (extname(pathname)) { res.writeHead(404); res.end("Not found"); return; } file = resolve(base, "index.html"); }
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Content-Length": body.length,
        "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-store" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch { res.writeHead(400); res.end("Bad request"); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8080);
  const server = createUatServer();
  server.listen(port, "0.0.0.0", () => console.log("GIGABYTE Cashback UAT listening on port " + port));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}
