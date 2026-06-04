import { handleInteraction } from "../../src/slack";
import { getConfig } from "../../src/config";

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const payload = JSON.parse(params.payload ?? "{}");

  const result = await handleInteraction(payload, config);
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
