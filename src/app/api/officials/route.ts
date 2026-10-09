import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { findOfficials } from "@/lib/officials";
import { isStateCode } from "@/lib/states";

// POST (not GET) so a street address never ends up in URLs or access logs.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "officials", 30, 10 * 60 * 1000);
    let body: { state?: unknown; address?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new CivicaError("Invalid request.", 400);
    }
    if (!isStateCode(body.state)) throw new CivicaError("Choose a valid state.", 400);
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 200) : "";

    try {
      return Response.json(await findOfficials(body.state, address || null));
    } catch (error) {
      console.error("Officials lookup failed", error);
      throw new CivicaError("Officials data is temporarily unavailable.", 503);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
