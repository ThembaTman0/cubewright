import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || 4317);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

createServer(async (req, res) => {
  const frame = req.method === "POST" && /^\/__frames\/([a-z0-9-]+)\/(\d{1,4})$/.exec(req.url);
  if (frame) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const data = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, "");
    const dir = join(root, "shots", frame[1]);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, frame[2].padStart(4, "0") + ".png"), Buffer.from(data, "base64"));
    return res.writeHead(204).end();
  }
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([\\/])+/, "");
  if (path.includes("..")) return res.writeHead(403).end();
  if (!extname(path)) path = join(path, "index.html");
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`cubewright on http://localhost:${port}/examples/token-bucket/`));
