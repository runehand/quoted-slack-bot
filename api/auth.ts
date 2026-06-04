import { findUserBySession } from "../src/auth-store";
import { parseCookies } from "../src/http";
import { getConfig } from "../src/config";
import { renderAuthPage } from "../src/web-pages";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const config = getConfig();
  const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
  const currentUser = await findUserBySession(cookies[config.sessionCookieName] ?? undefined);

  return new Response(
    renderAuthPage({
      next: url.searchParams.get("next") ?? "/connect",
      currentUser,
      error: url.searchParams.get("error") ?? undefined,
      success: url.searchParams.get("success") ?? undefined
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
