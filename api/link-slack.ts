import { findUserBySession, linkSlackAccount } from "../src/auth-store";
import { buildCookie, redirectResponse, parseCookies } from "../src/http";
import { getConfig } from "../src/config";

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
  const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
  const currentUser = await findUserBySession(cookies[config.sessionCookieName] ?? undefined);
  if (!currentUser) {
    return redirectResponse("/auth?error=Please sign in first.");
  }

  const body = await parseBody(request);
  const slackTeamId = body.slackTeamId ?? body.slack_team_id ?? "";
  const slackUserId = body.slackUserId ?? body.slack_user_id ?? "";
  const next = body.next ?? `/connect?slack_team_id=${encodeURIComponent(slackTeamId)}&slack_user_id=${encodeURIComponent(slackUserId)}`;

  if (!slackTeamId || !slackUserId) {
    return redirectResponse(`/connect?error=${encodeURIComponent("Missing Slack identifiers.")}`);
  }

  const linked = await linkSlackAccount({
    userId: currentUser.id,
    slackTeamId,
    slackUserId
  });

  if (!linked) {
    return redirectResponse(`/connect?error=${encodeURIComponent("Unable to link the Slack account.")}`);
  }

  return redirectResponse(`${next}${next.includes("?") ? "&" : "?"}success=${encodeURIComponent("Slack account linked.")}`);
}
