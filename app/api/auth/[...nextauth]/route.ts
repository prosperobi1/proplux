import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

// The login page writes this preference cookie just before signing in.
// With remember off, the session cookie must carry no expiry at all so the
// browser treats it as a session cookie and drops it when it closes.
const REMEMBER_COOKIE = "proplux_remember";

function readCookie(req: NextRequest, key: string): string | null {
  return req.cookies.get(key)?.value ?? null;
}

async function withRememberPreference(
  res: Response,
  req: NextRequest
): Promise<Response> {
  if (readCookie(req, REMEMBER_COOKIE) !== "0") return res;

  const setCookies = res.headers.getSetCookie();
  if (setCookies.length === 0) return res;

  let changed = false;
  const rewritten = setCookies.map((cookie) => {
    if (!/authjs\.session-token/.test(cookie)) return cookie;
    const eq = cookie.indexOf("=");
    const semi = cookie.indexOf(";");
    const value = cookie.slice(eq + 1, semi < 0 ? cookie.length : semi);
    // Sign-out clears the cookie with an empty value; that one keeps its
    // past expiry or the browser never actually deletes it.
    if (!value) return cookie;
    changed = true;
    return cookie.replace(/;\s*(?:expires|max-age)=[^;]*/gi, "");
  });
  if (!changed) return res;

  res.headers.delete("set-cookie");
  for (const cookie of rewritten) res.headers.append("set-cookie", cookie);
  return res;
}

export async function GET(req: NextRequest) {
  return withRememberPreference(await handlers.GET(req), req);
}

export async function POST(req: NextRequest) {
  return withRememberPreference(await handlers.POST(req), req);
}
