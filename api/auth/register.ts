import { buildCookie, redirectResponse } from "../../src/http";
import { createSession, createUser } from "../../src/auth-store";
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
  try {
    const config = getConfig();
    const body = await parseBody(request);
    const user = await createUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? ""
    });
    const sessionToken = await createSession(user.id);
    const nextUrl = body.next ?? "/connect";
    const secure = new URL(request.url).protocol === "https:";

    return redirectResponse(nextUrl, {
      "set-cookie": buildCookie(config.sessionCookieName, sessionToken, {
        httpOnly: true,
        secure,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return redirectResponse(`/auth?error=${encodeURIComponent(message)}`);
  }
}
