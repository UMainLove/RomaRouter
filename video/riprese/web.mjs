// Dal master al sito: H.264 1080p leggero (moov in testa: parte subito in streaming) + i pezzi per il mix con la voce.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
const FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const master = "out/romarouter-master.mp4";
const mb = (f) => (statSync(f).size / 1e6).toFixed(1) + " MB";
const run = (args) => execFileSync(FF, ["-v", "error", "-y", ...args], { stdio: "inherit" });
mkdirSync("../public/video", { recursive: true });
// sito: qualita' alta, peso contenuto (contenuti piatti: comprimono bene), audio AAC 160k
run(["-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF ?? "23", "-profile:v", "high", "-pix_fmt", "yuv420p", "-maxrate", "6M", "-bufsize", "12M", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "../public/video/romarouter.mp4"]);
// per il mix con la voce: il video senza audio e l'audio (musica + effetti) a parte
run(["-i", master, "-c:v", "copy", "-an", "out/romarouter-senza-audio.mp4"]);
run(["-i", master, "-vn", "-c:a", "pcm_s24le", "-ar", "48000", "out/romarouter-musica.wav"]);
for (const f of [master, "../public/video/romarouter.mp4", "out/romarouter-senza-audio.mp4", "out/romarouter-musica.wav"]) console.log(f, mb(f));
