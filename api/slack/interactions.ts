import { handleInteraction, verifySlackRequest } from "../../src/slack";
import { getConfig } from "../../src/config";

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const rawBody = await request.text();
  if (
    !verifySlackRequest(
      config.slackSigningSecret,
      request.headers.get("x-slack-request-timestamp") ?? undefined,
      rawBody,
      request.headers.get("x-slack-signature") ?? undefined
    )
  ) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const payload = JSON.parse(params.payload ?? "{}");

  const result = await handleInteraction(payload, config);
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
