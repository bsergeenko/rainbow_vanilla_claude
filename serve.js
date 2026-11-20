// Kleiner statischer Entwicklungsserver ohne Abhängigkeiten.
// Liefert die Dateien des Frontends aus und leitet alle unbekannten Pfade
// auf index.html um, damit das clientseitige Routing (History API) funktioniert.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const PUBLIC_DIRS = ["css", "js"];

function sendFile(res, filePath, status = 200) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Interner Serverfehler");
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = "/";
  }

  const segments = pathname.split("/").filter(Boolean);
  const isPublicFile = segments.length > 1 && PUBLIC_DIRS.includes(segments[0]);

  if (isPublicFile) {
    const filePath = path.normalize(path.join(ROOT, ...segments));
    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Datei nicht gefunden");
        return;
      }
      sendFile(res, filePath);
    });
    return;
  }

  // Alle anderen Pfade gehören zur Single-Page-Anwendung.
  sendFile(res, path.join(ROOT, "index.html"));
});

server.listen(PORT, "localhost", () => {
  console.log(`Frontend läuft auf http://localhost:${PORT}`);
});
