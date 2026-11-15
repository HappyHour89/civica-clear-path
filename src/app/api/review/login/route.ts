import { z } from "zod";
import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { reviewerForCode, sessionCookie, sessionToken } from "@/lib/review";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "review-login", 8, 15 * 60 * 1000);
    const parsed = z.object({ code: z.string().trim().min(1).max(200) }).safeParse(await request.json().catch(() => null));
    const name = parsed.success ? reviewerForCode(parsed.data.code) : null;
    if (!name) throw new CivicaError("That passcode isn't on the review panel.", 401);
    const response = Response.json({ name });
    const cookie = sessionCookie(sessionToken(name), 12 * 3600);
    response.headers.append(
      "Set-Cookie",
      `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Strict${cookie.secure ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
