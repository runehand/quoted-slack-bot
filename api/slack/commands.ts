import { handleSlashCommand } from "../../src/slack";
import { getConfig } from "../../src/config";

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const rawBody = await request.text();
  const command = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const result = await handleSlashCommand(
    {
      command: command.command ?? "",
      team_id: command.team_id,
      user_id: command.user_id,
      channel_id: command.channel_id,
      trigger_id: command.trigger_id
    },
    config
  );

  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
