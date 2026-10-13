import { NextResponse, type NextRequest } from "next/server";
import { isLanguage, LANGUAGE_COOKIE, type Language } from "@/lib/i18n";

function preferredLanguage(request: NextRequest): Language {
  const saved = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  const first = accepted.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ko") ? "ko" : "en";
}

// Every page lives under /en or /ko; anything without a language prefix is
// redirected to the visitor's saved or browser language.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];
  if (isLanguage(firstSegment)) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLanguage(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next.js internals, and files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
