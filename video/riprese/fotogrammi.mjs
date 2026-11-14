// Serve i fotogrammi delle riprese (video/riprese-dati) al montaggio, senza copiarli nel bundle di Remotion.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..", "riprese-dati");
const PORTA = Number(process.env.PORT ?? 3399);
createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([\/])+/, "");
  const file = join(RADICE, p);
  if (!file.startsWith(RADICE)) return res.writeHead(403).end();
  try {
    const st = statSync(file);
    if (!st.isFile()) return res.writeHead(200, { "Content-Type": "text/plain" }).end("fotogrammi delle riprese");
    res.writeHead(200, {
      "Content-Type": file.endsWith(".jpg") ? "image/jpeg" : "application/json",
      "Content-Length": st.size,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    });
    createReadStream(file).on("error", () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORTA, "127.0.0.1", () => console.log(`fotogrammi su http://127.0.0.1:${PORTA}`));
