import { connection } from "next/server";
import { coda, inviaLotto } from "@/lib/sportello-arte";

// POST /api/operatori/arte/invia — il lotto della sera (DEMO: le comunicazioni si scrivono, non partono).
export async function POST() {
  await connection();
  const creati = await inviaLotto();
  return Response.json({ creati, ...(await coda()) });
}
