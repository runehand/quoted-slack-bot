import { findUserBySession } from "../src/auth-store";
import { getConfig } from "../src/config";
import { parseCookies } from "../src/http";

export async function GET(request: Request): Promise<Response> {
  const config = getConfig();
  const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
  const user = await findUserBySession(cookies[config.sessionCookieName] ?? undefined);
  return Response.json({ user });
}
