import { connection } from "next/server";
import { azzeraDemo, coda } from "@/lib/sportello-arte";

// GET /api/operatori/arte — lo sportello: cosa parte stasera, per Gruppo di Polizia Locale, SIAE e Municipi.
export async function GET() {
  await connection();
  return Response.json(await coda(), { headers: { "Cache-Control": "no-store" } });
}

// DELETE /api/operatori/arte — DEMO: rimette in coda tutte le esibizioni e cancella le comunicazioni generate.
export async function DELETE() {
  await connection();
  await azzeraDemo();
  return Response.json(await coda());
}
