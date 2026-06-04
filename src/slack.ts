import crypto from "node:crypto";
import { WebClient, type View } from "@slack/web-api";
import { buildDemoCopy, buildMockApiResponse, getDemoPosts } from "./demo-data";
import { getConfig } from "./config";
import { findLinkedUser, listUsers } from "./auth-store";
import { DemoRequestInput, RequestMode } from "./types";

type ApiGatewayEvent = {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  httpMethod?: string;
  requestContext?: { http?: { method?: string; path?: string } };
  path?: string;
  isBase64Encoded?: boolean;
};

type SlackSlashCommand = {
  command: string;
  team_id?: string;
  user_id?: string;
  channel_id?: string;
  trigger_id?: string;
};

type SlackInteractionPayload = {
  type: "block_actions" | "view_submission";
  user: { id: string };
  team: { id: string };
  trigger_id?: string;
  actions?: Array<{ action_id: string }>;
  view?: {
    id: string;
    private_metadata?: string;
    state?: {
      values: Record<
        string,
        Record<string, { type: string; value?: string; selected_option?: { value: string } }>
      >;
    };
  };
};

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function verifySlackRequest(
  signingSecret: string,
  timestamp: string | undefined,
  rawBody: string,
  signature: string | undefined
): boolean {
  if (!signingSecret || !timestamp || !signature) {
    return false;
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || requestTime < fiveMinutesAgo) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;

  return timingSafeEqualString(expected, signature);
}

function parseBody(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body).entries());
}

function getActionId(payload: SlackInteractionPayload): string | undefined {
  return payload.actions?.[0]?.action_id;
}

function getModeFromAction(actionId: string | undefined): RequestMode | null {
  if (actionId === "quoted_call_experts") {
    return "experts";
  }

  if (actionId === "quoted_call_products") {
    return "products";
  }

  return null;
}

function buildMenuBlocks() {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Qwoted demo menu*\nChoose one of the structured newsroom workflows. This bot checks whether your Slack user is linked before showing the menu."
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Call for Experts" },
          action_id: "quoted_call_experts",
          value: "experts"
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Call for Products" },
          action_id: "quoted_call_products",
          value: "products"
        }
      ]
    }
  ];
}

function buildConnectBlocks(connectUrl: string) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Qwoted demo menu*\nYour Slack user is not linked yet."
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Connect Qwoted Account" },
          url: connectUrl
        }
      ]
    }
  ];
}

function buildConnectUrl(baseUrl: string, teamId: string, userId: string): string {
  const url = new URL("/connect", baseUrl);
  url.searchParams.set("slack_team_id", teamId);
  url.searchParams.set("slack_user_id", userId);
  return url.toString();
}

function buildModal(mode: RequestMode, teamId: string, userId: string): View {
  const isExperts = mode === "experts";
  const targetLabel = isExperts ? "Who are you looking for?" : "What product are you looking for?";
  const title = isExperts ? "Call for Experts" : "Call for Products";

  return {
    type: "modal",
    callback_id: "quoted_request_submit",
    title: { type: "plain_text", text: title },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({ mode, teamId, userId }),
    blocks: [
      {
        type: "input",
        block_id: "title",
        label: { type: "plain_text", text: "Title / Topic" },
        element: { type: "plain_text_input", action_id: "value" }
      },
      {
        type: "input",
        block_id: "description",
        label: { type: "plain_text", text: "Description" },
        element: { type: "plain_text_input", action_id: "value", multiline: true }
      },
      {
        type: "input",
        block_id: "audience",
        label: { type: "plain_text", text: targetLabel },
        element: { type: "plain_text_input", action_id: "value" }
      },
      {
        type: "input",
        block_id: "deadline",
        label: { type: "plain_text", text: "Deadline" },
        element: { type: "plain_text_input", action_id: "value", placeholder: { type: "plain_text", text: "Friday" } }
      },
      {
        type: "input",
        block_id: "category",
        label: { type: "plain_text", text: "Category" },
        element: { type: "plain_text_input", action_id: "value" }
      }
    ]
  } as View;
}

function extractValue(
  state: NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>,
  blockId: string
): string {
  const field = state.values[blockId];
  if (!field) {
    return "";
  }

  const first = Object.values(field)[0];
  if (!first) {
    return "";
  }

  if ("selected_option" in first && first.selected_option) {
    return first.selected_option.value;
  }

  return first.value ?? "";
}

async function postDemoMessages(
  slackClient: WebClient,
  input: DemoRequestInput,
  copy: Awaited<ReturnType<typeof buildDemoCopy>>,
  teamId: string,
  userId: string
): Promise<void> {
  const dm = await slackClient.conversations.open({ users: userId });
  const channel = dm.channel?.id;
  if (!channel) {
    return;
  }

  await slackClient.chat.postMessage({
    channel,
    text: copy.confirmation
  });

  await slackClient.chat.postMessage({
    channel,
    text: copy.notification,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: copy.notification
        }
      }
    ]
  });

  if (!input.linkedUser) {
    await slackClient.chat.postMessage({
      channel,
      text: `Linked user lookup for ${teamId}/${userId} could not be confirmed.`
    });
  }
}

export async function handleSlashCommand(
  event: SlackSlashCommand,
  config = getConfig()
): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  if (event.command !== "/quoted") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ response_type: "ephemeral", text: "Unsupported command." })
    };
  }

  const linkedUser = await findLinkedUser(event.team_id, event.user_id);
  const connectUrl =
    event.team_id && event.user_id ? buildConnectUrl(config.appBaseUrl, event.team_id, event.user_id) : config.appBaseUrl;
  const blocks = linkedUser ? buildMenuBlocks() : buildConnectBlocks(connectUrl);

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      response_type: "ephemeral",
      blocks,
      text: linkedUser
        ? "Choose Call for Experts or Call for Products."
        : "Connect your Qwoted account to continue."
    })
  };
}

export async function handleInteraction(
  payload: SlackInteractionPayload,
  config = getConfig()
): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  const actionId = getActionId(payload);
  const mode = getModeFromAction(actionId);

  if (payload.type === "block_actions" && mode) {
    if (!config.slackBotToken) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response_type: "ephemeral",
          text: "Slack bot token is missing, so the modal cannot open in this demo environment."
        })
      };
    }

    const client = new WebClient(config.slackBotToken);
    await client.views.open({
      trigger_id: payload.trigger_id ?? "",
      view: buildModal(mode, payload.team.id, payload.user.id)
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    };
  }

  if (payload.type === "view_submission" && payload.view?.private_metadata) {
    const privateMetadata = JSON.parse(payload.view.private_metadata) as {
      mode: RequestMode;
      teamId: string;
      userId: string;
    };
    const state = payload.view.state;
    const title = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "title");
    const description = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "description");
    const audience = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "audience");
    const deadline = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "deadline");
    const category = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "category");
    const linkedUser = await findLinkedUser(privateMetadata.teamId, privateMetadata.userId);

    const requestInput: DemoRequestInput = {
      mode: privateMetadata.mode,
      title,
      description,
      audience,
      deadline,
      category,
      linkedUser
    };

    const copy = buildDemoCopy(requestInput, config.demoRequestBaseUrl, linkedUser);

    if (config.slackBotToken) {
      const client = new WebClient(config.slackBotToken);
      await postDemoMessages(client, requestInput, copy, privateMetadata.teamId, privateMetadata.userId);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        response_action: "clear"
      })
    };
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  };
}

export async function handleApiRoute(
  route: string,
  method: string,
  body: string | undefined,
  headers: Record<string, string | undefined>
): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  const config = getConfig();

  if (route === "/health" && method === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  }

  if (route === "/slack/commands" && method === "POST") {
    const rawBody = body ?? "";
    if (!verifySlackRequest(config.slackSigningSecret, headers["x-slack-request-timestamp"], rawBody, headers["x-slack-signature"])) {
      return { statusCode: 401, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "invalid signature" }) };
    }

    const command = parseBody(rawBody);
    return handleSlashCommand(
      {
        command: command.command,
        team_id: command.team_id,
        user_id: command.user_id,
        channel_id: command.channel_id,
        trigger_id: command.trigger_id
      },
      config
    );
  }

  if (route === "/slack/interactions" && method === "POST") {
    const rawBody = body ?? "";
    if (!verifySlackRequest(config.slackSigningSecret, headers["x-slack-request-timestamp"], rawBody, headers["x-slack-signature"])) {
      return { statusCode: 401, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "invalid signature" }) };
    }

    const params = parseBody(rawBody);
    const payload = JSON.parse(params.payload) as SlackInteractionPayload;
    return handleInteraction(payload, config);
  }

  if (route === "/api/demo-notification" && method === "POST") {
    const json = body ? (JSON.parse(body) as Partial<DemoRequestInput>) : {};
    const input: DemoRequestInput = {
      mode: json.mode === "products" ? "products" : "experts",
      title: json.title ?? "Gas prices",
      description: json.description ?? "Media request demo",
      audience: json.audience ?? "Economists or energy experts",
      deadline: json.deadline ?? "Friday",
      category: json.category ?? "Newsroom",
      linkedUser: undefined
    };

    const copy = buildDemoCopy(input, config.demoRequestBaseUrl);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(copy)
    };
  }

  if (route === "/api/users" && method === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ users: await listUsers() })
    };
  }

  if (route === "/api/posts" && method === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ posts: getDemoPosts() })
    };
  }

  if (route === "/api/mock-data" && method === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildMockApiResponse(await listUsers()))
    };
  }

  if ((route === "/" || route === "/api") && method === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Qwoted Slack Bot Demo",
        endpoints: {
          health: "/api/health",
          users: "/api/users",
          posts: "/api/posts",
          mockData: "/api/mock-data",
          slackCommands: "/api/slack/commands",
          slackInteractions: "/api/slack/interactions",
          demoNotification: "/api/demo-notification",
          auth: "/auth",
          connect: "/connect"
        }
      })
    };
  }

  return {
    statusCode: 404,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: "not found", route, method })
  };
}
