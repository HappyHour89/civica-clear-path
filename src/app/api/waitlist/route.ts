import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { joinWaitlist, WaitlistSchema } from "@/lib/waitlist";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "waitlist", 5, 10 * 60 * 1000);
    let input;
    try {
      input = WaitlistSchema.parse(await request.json());
    } catch {
      throw new CivicaError("Enter a valid email address.", 400);
    }
    await joinWaitlist(input);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
