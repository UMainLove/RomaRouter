import { connection, type NextRequest } from "next/server";
import { emlInvio } from "@/lib/sportello-arte";

// GET /api/operatori/arte/invii/<id> — la comunicazione come file .eml (si apre con qualunque programma di posta).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return new Response("Non trovato", { status: 404 });
  const eml = await emlInvio(id);
  if (!eml) return new Response("Non trovato", { status: 404 });
  return new Response(eml.testo, {
    headers: { "Content-Type": "message/rfc822", "Content-Disposition": `attachment; filename="${eml.nome}"`, "Cache-Control": "no-store" },
  });
}
