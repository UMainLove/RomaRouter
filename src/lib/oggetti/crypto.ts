import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Cifratura applicativa (AES-256-GCM), impronte HMAC-SHA256 e firma token per Oggetti Smarriti.
 * Chiave master da OGGETTI_SEGRETO (.env.local), derivata per dominio così cifratura, HMAC e sessione
 * non usano mai la stessa sottochiave.
 */

function leggiSegretoMaster(): string {
  const s = process.env.OGGETTI_SEGRETO;
  if (!s || s.length < 32 || s.includes("CAMBIAMI")) {
    throw new Error("OGGETTI_SEGRETO mancante o troppo corto in .env.local (servono almeno 32 caratteri)");
  }
  return s;
}

function sottochiave(dominio: "aes" | "hmac" | "sessione"): Buffer {
  return createHmac("sha256", leggiSegretoMaster()).update(`romarouter:oggetti:${dominio}:v1`).digest();
}

export function cifra(testo: string): string {
  const key = sottochiave("aes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(testo, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decifra(payload: string): string {
  const parti = payload.split(".");
  if (parti.length !== 3) throw new Error("Payload cifrato non valido");
  const [ivB64, tagB64, encB64] = parti;
  const key = sottochiave("aes");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const dec = Buffer.concat([decipher.update(Buffer.from(encB64, "base64url")), decipher.final()]);
  return dec.toString("utf8");
}

export function decifraSicuro(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decifra(payload);
  } catch {
    return null;
  }
}

/** Normalizza un numero documento o codice prima dell'impronta HMAC-SHA256. */
export function normalizzaCodiceSensibile(valore: string): string {
  return valore
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function impronta(valore: string, ambito: "doc" | "consegna" | "token" | "pin"): string {
  const norm = ambito === "token" ? valore.trim() : normalizzaCodiceSensibile(valore);
  return createHmac("sha256", sottochiave("hmac")).update(`${ambito}:${norm}`).digest("hex");
}

export function firmaPayload(json: string): string {
  const body = Buffer.from(json, "utf8").toString("base64url");
  const sig = createHmac("sha256", sottochiave("sessione")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verificaPayloadFirmato(token: string): string | null {
  const parti = token.split(".");
  if (parti.length !== 2) return null;
  const [body, sig] = parti;
  const attesa = createHmac("sha256", sottochiave("sessione")).update(body).digest();
  const fornita = Buffer.from(sig, "base64url");
  if (attesa.length !== fornita.length || !timingSafeEqual(attesa, fornita)) return null;
  return Buffer.from(body, "base64url").toString("utf8");
}

export function generaCodiceConsegna(): string {
  const alf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(6);
  const chars = Array.from(b, (v) => alf[v % alf.length]).join("");
  return `CNS-${chars.slice(0, 3)}-${chars.slice(3)}`;
}

export function generaCodiceRitiro(): string {
  const num = randomBytes(3).readUIntBE(0, 3) % 900000 + 100000;
  return `RIT-${num}`;
}

export function generaNumeroMascherato(): string {
  const n = randomBytes(2).readUInt16BE(0) % 9000 + 1000;
  return `+39 06 9480 ${n} (mascherato)`;
}

export function generaPseudonimo(prefisso = "Richiedente"): string {
  const hex = randomBytes(2).toString("hex").toUpperCase();
  return `${prefisso} #${hex}`;
}

export function generaTokenCasuale(): string {
  return randomBytes(18).toString("base64url");
}
