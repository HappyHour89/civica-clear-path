import { CivicaError } from "./claude";
import { checkRateLimit, clientKey } from "./rateLimit";

export function errorResponse(error: unknown) {
  if (error instanceof CivicaError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Unhandled server error", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function enforceRateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  const result = checkRateLimit(`${bucket}:${clientKey(request)}`, limit, windowMs);
  if (!result.allowed) {
    throw new CivicaError(
      `You've reached the limit for now. Please try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
      429,
    );
  }
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
