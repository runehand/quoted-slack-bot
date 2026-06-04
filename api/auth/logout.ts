import { deleteSession } from "../../src/auth-store";
import { clearCookie, redirectResponse } from "../../src/http";
import { getConfig } from "../../src/config";
import { parseCookies } from "../../src/http";

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
  await deleteSession(cookies[config.sessionCookieName] ?? undefined);
  return redirectResponse("/auth", {
    "set-cookie": clearCookie(config.sessionCookieName)
  });
}
