import { authenticateUser, createSession } from "../../src/auth-store";
import { buildCookie, redirectResponse } from "../../src/http";
import { getConfig } from "../../src/config";

async function parseBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, string>;
  }

  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const body = await parseBody(request);
  const user = await authenticateUser(body.email ?? "", body.password ?? "");
  if (!user) {
    return redirectResponse(`/auth?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  const sessionToken = await createSession(user.id);
  const secure = new URL(request.url).protocol === "https:";
  return redirectResponse(body.next ?? "/connect", {
    "set-cookie": buildCookie(config.sessionCookieName, sessionToken, {
      httpOnly: true,
      secure,
      maxAgeSeconds: 60 * 60 * 24 * 7
    })
  });
}
