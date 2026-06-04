import { findLinkedUser, findUserBySession } from "../src/auth-store";
import { getConfig } from "../src/config";
import { parseCookies } from "../src/http";
import { renderConnectPage } from "../src/web-pages";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const config = getConfig();
  const slackTeamId = url.searchParams.get("slack_team_id") ?? "";
  const slackUserId = url.searchParams.get("slack_user_id") ?? "";
  const next = url.searchParams.get("next") ?? url.pathname + url.search;
  const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
  const currentUser = await findUserBySession(cookies[config.sessionCookieName] ?? undefined);
  const linkedUser = slackTeamId && slackUserId ? await findLinkedUser(slackTeamId, slackUserId) : null;

  return new Response(
    renderConnectPage({
      next,
      slackTeamId,
      slackUserId,
      currentUser,
      linkedUser,
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
