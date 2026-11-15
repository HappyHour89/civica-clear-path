import { connection } from "next/server";
import { listLibrary } from "@/lib/publicPages";

// The newest published pages, for the newspaper's "From the Library" box.
export async function GET() {
  // Always answer per request (never pre-built at build time).
  await connection();
  const entries = await listLibrary(6);
  return Response.json({ entries });
}
