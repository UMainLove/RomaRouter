// Il sito di produzione (next start) per le riprese. OGGETTI_SEGRETO: un segreto casuale a ogni avvio,
// solo per le sessioni di prova delle riprese (in produzione vero sta in .env.local).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const porta = process.env.PORT ?? "3100";
const env = { ...process.env, OGGETTI_SEGRETO: process.env.OGGETTI_SEGRETO ?? randomBytes(32).toString("hex") };
const p = spawn("npx", ["next", "start", "-p", porta], { stdio: "inherit", env, shell: true });
p.on("exit", (c) => process.exit(c ?? 0));
