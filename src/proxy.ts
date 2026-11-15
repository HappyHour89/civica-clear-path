import { NextResponse, type NextRequest } from "next/server";

// Cross-site request protection for the API. Browsers always send an Origin
// header with POST requests, so a write that comes from another website's page
// is refused here, before any route runs. Requests with no Origin at all are
// not from a web page and can't carry a visitor's cookies, so they pass.
// Stripe's webhook is server-to-server and checks its own signature.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT = new Set(["/api/stripe/webhook"]);

type ApiRequest = { method: string; headers: Headers; nextUrl: { pathname: string; host: string } };

export function isCrossSite(request: ApiRequest) {
  if (SAFE_METHODS.has(request.method) || EXEMPT.has(request.nextUrl.pathname)) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== (request.headers.get("host") ?? request.nextUrl.host);
    } catch {
      return true;
    }
  }
  return request.headers.get("sec-fetch-site") === "cross-site";
}

export function proxy(request: NextRequest) {
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
