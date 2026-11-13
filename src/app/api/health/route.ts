import { connection } from "next/server";
import { query } from "@/lib/db";

// GET /api/health: verifica che l'app raggiunga Postgres e quali estensioni sono attive.
export async function GET() {
  await connection(); // sempre a runtime, mai prerenderizzato in build

  try {
    const { rows } = await query<{ extname: string; extversion: string }>(
      "SELECT extname, extversion FROM pg_extension ORDER BY extname",
    );
    const extensions = Object.fromEntries(rows.map((r) => [r.extname, r.extversion]));
    return Response.json({ ok: true, database: "up", extensions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, database: "down", error: message }, { status: 503 });
  }
}
