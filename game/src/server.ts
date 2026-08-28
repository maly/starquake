import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(THIS_DIR, "../..");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
};

function contentType(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

function under(root: string, file: string): boolean {
  const rel = path.relative(root, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function resolvePublic(urlPath: string, root: string): string | null {
  let raw = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  if (raw === "/") return path.join(root, "viewer", "index.html");
  if (raw === "/viewer") raw = "/viewer/";
  if (raw.startsWith("/viewer/")) {
    const rest = raw.slice("/viewer/".length);
    if (rest === "out" || rest.startsWith("out/")) {
      const file = path.resolve(root, "out", rest.slice("out".length).replace(/^\//, "") || "");
      if (file === path.join(root, "out")) return null;
      return under(path.join(root, "out"), file) ? file : null;
    }
    const file = path.resolve(root, "viewer", rest === "" ? "index.html" : rest);
    return under(path.join(root, "viewer"), file) || file === path.join(root, "viewer", "index.html")
      ? file
      : null;
  }
  if (raw.startsWith("/out/")) {
    const file = path.resolve(root, "out", raw.slice("/out/".length));
    return under(path.join(root, "out"), file) ? file : null;
  }
  return null;
}

export function handle(root: string, req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? "/";
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  const file = resolvePublic(url, root);
  if (!file || !under(root, file) || !existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }
  const st = statSync(file);
  if (!st.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentType(file),
    "Content-Length": st.size,
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

export function serve(port = 8000, root = REPO_ROOT): Promise<{ server: Server; port: number; url: string }> {
  const server = createServer((req, res) => handle(root, req, res));
  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      const bound = addr && typeof addr === "object" ? addr.port : port;
      resolve({ server, port: bound, url: `http://127.0.0.1:${bound}/viewer/` });
    });
    server.on("error", reject);
  });
}

function parsePort(argv: string[]): number {
  const i = argv.indexOf("--port");
  if (i !== -1) return parseInt(argv[i + 1] ?? "8000", 10);
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  return 8000;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const normalized = path.normalize(entry);
  return /[/\\]server\.(ts|js)$/.test(normalized);
}

if (isDirectRun()) {
  const port = parsePort(process.argv);
  void serve(port).then(({ url }) => {
    process.stdout.write(`Starquake ${url}\n`);
  });
}
