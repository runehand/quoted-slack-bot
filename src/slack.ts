import crypto from "node:crypto";
import { WebClient, type View } from "@slack/web-api";
import { analyzeRequestMatch, buildDemoCopy, buildMockApiResponse } from "./demo-data";
import { getConfig } from "./config";
import {
  appendActionLog,
  authenticateUser,
  createPost,
  createSession,
  createUser,
  deleteSession,
  listActionLogs,
  findLinkedUser,
  findUserBySession,
  linkSlackAccount,
  listPosts,
  listUsers
} from "./auth-store";
import { buildCookie, clearCookie, parseCookies, redirectResponse } from "./http";
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
  container?: { channel_id?: string; channel_type?: string };
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
          "*Qwoted request menu*\nChoose one of the structured newsroom workflows. This bot checks whether your Slack user is linked before showing the menu."
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
        text: "*Qwoted request menu*\nYour Slack user is not linked yet."
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

function buildModal(mode: RequestMode, teamId: string, userId: string, channelId?: string): View {
  const isExperts = mode === "experts";
  const targetLabel = isExperts ? "Who are you looking for?" : "What product are you looking for?";
  const title = isExperts ? "Call for Experts" : "Call for Products";

  return {
    type: "modal",
    callback_id: "quoted_request_submit",
    title: { type: "plain_text", text: title },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({ mode, teamId, userId, channelId: channelId ?? null }),
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
        optional: true,
        element: { type: "plain_text_input", action_id: "value", multiline: true }
      },
      {
        type: "input",
        block_id: "audience",
        label: { type: "plain_text", text: targetLabel },
        optional: true,
        element: { type: "plain_text_input", action_id: "value" }
      },
      {
        type: "input",
        block_id: "deadline",
        label: { type: "plain_text", text: "Deadline" },
        optional: true,
        element: { type: "plain_text_input", action_id: "value", placeholder: { type: "plain_text", text: "Friday" } }
      },
      {
        type: "input",
        block_id: "category",
        label: { type: "plain_text", text: "Category" },
        optional: true,
        element: { type: "plain_text_input", action_id: "value" }
      }
    ]
  } as View;
}

function buildSuccessView(
  input: DemoRequestInput,
  copy: Awaited<ReturnType<typeof buildDemoCopy>>
): View {
  const requestLabel = input.mode === "experts" ? "Call for Experts" : "Call for Products";
  const matchedPost = copy.matchedPost;
  const matchedSection = matchedPost
    ? `*Matched candidate:* ${matchedPost.title}\n` +
      `*Candidate summary:* ${matchedPost.summary}\n` +
      `*Score:* ${copy.matchedPostScore}\n\n`
    : `*Matched candidate:* None yet\n*Candidate summary:* Create posts in the Posts section.\n\n`;
  return {
    type: "modal",
    title: { type: "plain_text", text: "Submitted" },
    close: { type: "plain_text", text: "Done" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${requestLabel} submitted*\n\n` +
            matchedSection +
            `View request: ${copy.requestUrl}`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open Request" },
            url: copy.requestUrl
          }
        ]
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
    recordActionLog({
      action: "slack.post_request_messages",
      source: "slack",
      status: "error",
      summary: "Could not open a DM channel for the request notification.",
      details: { teamId, userId }
    });
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

  recordActionLog({
    action: "slack.post_request_messages",
    source: "slack",
    status: "ok",
    summary: "Sent request confirmation and notification messages.",
    details: {
      teamId,
      userId,
      requestId: copy.requestId,
      requestUrl: copy.requestUrl,
      mode: input.mode,
      title: input.title
    }
  });
}

async function postSubmissionMessage(
  slackClient: WebClient,
  input: DemoRequestInput,
  copy: Awaited<ReturnType<typeof buildDemoCopy>>,
  channelId: string,
  teamId: string,
  userId: string
): Promise<void> {
  const matchedPost = copy.matchedPost;

  await appendActionLog({
    action: "slack.reply_delivery",
    source: "slack",
    status: "ok",
    summary: "Attempting to post submission confirmation to Slack.",
    slackTeamId: teamId,
    slackUserId: userId,
    details: {
      channelId,
      requestId: copy.requestId,
      requestUrl: copy.requestUrl,
      mode: input.mode,
      title: input.title
    }
  });

  try {
    const messageText = matchedPost
      ? `Matched candidate for ${input.mode === "experts" ? "Call for Experts" : "Call for Products"}:\n` +
        `${matchedPost.title}\n` +
        `${matchedPost.summary}\n` +
        `Score: ${copy.matchedPostScore}\n` +
        `View request: ${copy.requestUrl}`
      : `Request submitted for ${input.mode === "experts" ? "Call for Experts" : "Call for Products"}.\n` +
        `No live candidate matched yet.\n` +
        `View request: ${copy.requestUrl}`;

    const response = await slackClient.chat.postMessage({
      channel: channelId,
      text: messageText
    });

    await appendActionLog({
      action: "slack.reply_delivery",
      source: "slack",
      status: "ok",
      summary: "Posted submission confirmation to Slack.",
      slackTeamId: teamId,
      slackUserId: userId,
      details: {
        channelId,
        requestId: copy.requestId,
        requestUrl: copy.requestUrl,
        mode: input.mode,
        title: input.title,
        matchedPost: matchedPost
          ? {
              id: matchedPost.id,
              title: matchedPost.title,
              score: copy.matchedPostScore,
              mode: matchedPost.mode
            }
          : null,
        slackChannel: response.channel ?? null,
        slackTs: response.ts ?? null
      }
    });
  } catch (error) {
    const slackError = error instanceof Error ? error.message : String(error);
    await appendActionLog({
      action: "slack.reply_delivery",
      source: "slack",
      status: "error",
      summary: "Failed to post submission confirmation to Slack.",
      slackTeamId: teamId,
      slackUserId: userId,
      details: {
        channelId,
        requestId: copy.requestId,
        requestUrl: copy.requestUrl,
        mode: input.mode,
        title: input.title,
        matchedPost: matchedPost
          ? {
              id: matchedPost.id,
              title: matchedPost.title,
              score: copy.matchedPostScore,
              mode: matchedPost.mode
            }
          : null,
        error: slackError
      }
    });
  }
}

function recordActionLog(input: Parameters<typeof appendActionLog>[0]): void {
  void appendActionLog(input).catch(() => undefined);
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
  recordActionLog({
    action: "slack.command",
    source: "slack",
    status: "ok",
    summary: linkedUser ? "Slack slash command opened the workflow menu." : "Slack slash command showed connect prompt.",
    slackTeamId: event.team_id ?? null,
    slackUserId: event.user_id ?? null,
    details: {
      command: event.command,
      linked: Boolean(linkedUser)
    }
  });
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
    recordActionLog({
      action: "slack.button_click",
      source: "slack",
      status: "ok",
      summary: `Opened ${mode === "experts" ? "Call for Experts" : "Call for Products"} modal.`,
      slackTeamId: payload.team.id,
      slackUserId: payload.user.id,
      details: {
        actionId,
        mode
      }
    });
    if (!config.slackBotToken) {
      recordActionLog({
        action: "slack.modal_open",
        source: "slack",
        status: "error",
        summary: "Slack bot token missing so modal could not open.",
        slackTeamId: payload.team.id,
        slackUserId: payload.user.id
      });
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response_type: "ephemeral",
          text: "Slack bot token is missing, so the modal cannot open in the current environment."
        })
      };
    }

    const client = new WebClient(config.slackBotToken);
    await client.views.open({
      trigger_id: payload.trigger_id ?? "",
      view: buildModal(mode, payload.team.id, payload.user.id, payload.container?.channel_id)
    });
    recordActionLog({
      action: "slack.modal_open",
      source: "slack",
      status: "ok",
      summary: "Opened Slack modal.",
      slackTeamId: payload.team.id,
      slackUserId: payload.user.id,
      details: { mode }
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
      channelId?: string | null;
    };
    const state = payload.view.state;
    const title = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "title");
    const description = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "description");
    const audience = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "audience");
    const deadline = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "deadline");
    const category = extractValue(state as NonNullable<NonNullable<SlackInteractionPayload["view"]>["state"]>, "category");

    const requestInput: DemoRequestInput = {
      mode: privateMetadata.mode,
      title,
      description,
      audience,
      deadline,
      category,
      linkedUser: null
    };

    const posts = await listPosts();
    const match = analyzeRequestMatch(requestInput.mode, requestInput, posts);
    const copy = await buildDemoCopy(requestInput, config.demoRequestBaseUrl, null, posts);
    recordActionLog({
      action: "slack.modal_submit",
      source: "slack",
      status: "ok",
      summary: "Slack modal submission received and acknowledged.",
      slackTeamId: privateMetadata.teamId,
      slackUserId: privateMetadata.userId,
      details: {
        mode: privateMetadata.mode,
        title,
        searchText: match.searchText,
        searchTokens: match.searchTokens,
        matchedPost: match.matchedPost
          ? {
              id: match.matchedPost.id,
              title: match.matchedPost.title,
              score: match.matchedPostScore,
              mode: match.matchedPost.mode
            }
          : null,
        deadline,
        category,
        requestId: copy.requestId,
        requestUrl: copy.requestUrl
      }
    });

    recordActionLog({
      action: "slack.request_match",
      source: "slack",
      status: match.matchedPostScore > 0 ? "ok" : "error",
      summary:
        match.matchedPostScore > 0
          ? `Found a reply candidate: ${match.matchedPost?.title ?? "Unknown"}.`
          : "No strong reply candidate was found for the request.",
      slackTeamId: privateMetadata.teamId,
      slackUserId: privateMetadata.userId,
      details: {
        mode: privateMetadata.mode,
        title,
        searchText: match.searchText,
        searchTokens: match.searchTokens,
        matchedPost: match.matchedPost
          ? {
              id: match.matchedPost.id,
              title: match.matchedPost.title,
              score: match.matchedPostScore,
              mode: match.matchedPost.mode
            }
          : null,
        scores: match.allScores
      }
    });

    if (config.slackBotToken && privateMetadata.channelId) {
      const client = new WebClient(config.slackBotToken);
      await postSubmissionMessage(
        client,
        requestInput,
        copy,
        privateMetadata.channelId,
        privateMetadata.teamId,
        privateMetadata.userId
      ).catch(() => undefined);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        response_action: "update",
        view: buildSuccessView(requestInput, copy)
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
  headers: Record<string, string | undefined>,
  searchParams: URLSearchParams = new URLSearchParams()
): Promise<Response> {
  const config = getConfig();

  if (route === "/api/health" && method === "GET") {
    return Response.json({ ok: true });
  }

  if (route === "/api/auth/register" && method === "POST") {
    const form = parseBody(body ?? "");
    try {
      const user = await createUser({
        name: form.name ?? "",
        email: form.email ?? "",
        password: form.password ?? ""
      });
      recordActionLog({
        action: "auth.register",
        source: "web",
        actorUserId: user.id,
        actorEmail: user.email,
        status: "ok",
        summary: "Created a new Qwoted account.",
        details: { next: form.next ?? "/connect" }
      });
      const sessionToken = await createSession(user.id);
      const secure = headers["x-forwarded-proto"] === "https" || new URL(config.appBaseUrl).protocol === "https:";
      return redirectResponse(form.next ?? "/connect", {
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

  if (route === "/api/auth/login" && method === "POST") {
    const form = parseBody(body ?? "");
    const user = await authenticateUser(form.email ?? "", form.password ?? "");
    if (!user) {
      recordActionLog({
        action: "auth.login",
        source: "web",
        actorEmail: form.email ?? null,
        status: "error",
        summary: "Login failed.",
        details: { reason: "invalid_credentials" }
      });
      return redirectResponse(`/auth?error=${encodeURIComponent("Invalid email or password.")}`);
    }

    recordActionLog({
      action: "auth.login",
      source: "web",
      actorUserId: user.id,
      actorEmail: user.email,
      status: "ok",
      summary: "Signed in to Qwoted account.",
      details: { next: form.next ?? "/connect" }
    });
    const sessionToken = await createSession(user.id);
    const secure = headers["x-forwarded-proto"] === "https" || new URL(config.appBaseUrl).protocol === "https:";
    return redirectResponse(form.next ?? "/connect", {
      "set-cookie": buildCookie(config.sessionCookieName, sessionToken, {
        httpOnly: true,
        secure,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    });
  }

  if (route === "/api/auth/logout" && method === "POST") {
    const cookies = parseCookies(headers.cookie);
    recordActionLog({
      action: "auth.logout",
      source: "web",
      status: "ok",
      summary: "Signed out of Qwoted account.",
      details: { hadSession: Boolean(cookies[config.sessionCookieName]) }
    });
    await deleteSession(cookies[config.sessionCookieName]);
    return redirectResponse("/auth", {
      "set-cookie": clearCookie(config.sessionCookieName)
    });
  }

  if (route === "/api/link-slack" && method === "POST") {
    const cookies = parseCookies(headers.cookie);
    const currentUser = await findUserBySession(cookies[config.sessionCookieName]);
    if (!currentUser) {
      return redirectResponse("/auth?error=Please sign in first.");
    }

    const form = parseBody(body ?? "");
    const slackTeamId = form.slackTeamId ?? form.slack_team_id ?? "";
    const slackUserId = form.slackUserId ?? form.slack_user_id ?? "";
    const next = form.next ?? `/connect?slack_team_id=${encodeURIComponent(slackTeamId)}&slack_user_id=${encodeURIComponent(slackUserId)}`;

    if (!slackTeamId || !slackUserId) {
      return redirectResponse(`/connect?error=${encodeURIComponent("Missing Slack identifiers.")}`);
    }

    const linked = await linkSlackAccount({
      userId: currentUser.id,
      slackTeamId,
      slackUserId
    });

    if (!linked) {
      recordActionLog({
        action: "slack.link_account",
        source: "web",
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        slackTeamId,
        slackUserId,
        status: "error",
        summary: "Failed to link Slack account.",
        details: { next }
      });
      return redirectResponse(`/connect?error=${encodeURIComponent("Unable to link the Slack account.")}`);
    }

    recordActionLog({
      action: "slack.link_account",
      source: "web",
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      slackTeamId,
      slackUserId,
      status: "ok",
      summary: "Linked Slack account to Qwoted account.",
      details: { next }
    });
    return redirectResponse(`${next}${next.includes("?") ? "&" : "?"}success=${encodeURIComponent("Slack account linked.")}`);
  }

  if (route === "/api/me" && method === "GET") {
    const cookies = parseCookies(headers.cookie);
    const user = await findUserBySession(cookies[config.sessionCookieName]);
    return Response.json({ user });
  }

  if (route === "/api/slack/commands" && method === "POST") {
    const rawBody = body ?? "";
    if (!verifySlackRequest(config.slackSigningSecret, headers["x-slack-request-timestamp"], rawBody, headers["x-slack-signature"])) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }

    const command = parseBody(rawBody);
    const result = await handleSlashCommand(
      {
        command: command.command,
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

  if (route === "/api/slack/interactions" && method === "POST") {
    const rawBody = body ?? "";
    if (!verifySlackRequest(config.slackSigningSecret, headers["x-slack-request-timestamp"], rawBody, headers["x-slack-signature"])) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }

    const params = parseBody(rawBody);
    const payload = JSON.parse(params.payload) as SlackInteractionPayload;
    const result = await handleInteraction(payload, config);
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers
    });
  }

  if (route === "/api/demo-notification" && method === "POST") {
    const json = body ? (JSON.parse(body) as Partial<DemoRequestInput>) : {};
    const input: DemoRequestInput = {
      mode: json.mode === "products" ? "products" : "experts",
      title: json.title ?? "Gas prices",
      description: json.description ?? "Media request workflow",
      audience: json.audience ?? "Economists or energy experts",
      deadline: json.deadline ?? "Friday",
      category: json.category ?? "Newsroom",
      linkedUser: undefined
    };

    const copy = await buildDemoCopy(input, config.demoRequestBaseUrl);
    return Response.json(copy);
  }

  if (route === "/api/users" && method === "GET") {
    return Response.json({ users: await listUsers() });
  }

  if (route === "/api/posts" && method === "GET") {
    return Response.json({ posts: await listPosts() });
  }

  if (route === "/api/posts" && method === "POST") {
    const cookies = parseCookies(headers.cookie);
    const currentUser = await findUserBySession(cookies[config.sessionCookieName]);
    if (!currentUser) {
      return redirectResponse("/auth?next=/posts&error=Please sign in first.");
    }

    const form = parseBody(body ?? "");
    try {
      const post = await createPost({
        ownerUserId: currentUser.id,
        title: form.title ?? "",
        summary: form.summary ?? "",
        mode: form.mode === "products" ? "products" : "experts",
        requestedBy: currentUser.name,
        deadline: form.deadline ?? "",
        category: form.category ?? "",
        status: (form.status as "open" | "answered" | "pending" | undefined) ?? "open"
      });

      recordActionLog({
        action: "posts.create",
        source: "web",
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        status: "ok",
        summary: "Created a request post.",
        details: {
          postId: post.id,
          title: post.title,
          mode: post.mode
        }
      });

      return redirectResponse(`/posts?success=${encodeURIComponent("Post created.")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create post.";
      recordActionLog({
        action: "posts.create",
        source: "web",
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        status: "error",
        summary: "Failed to create a request post.",
        details: { error: message }
      });
      return redirectResponse(`/posts?error=${encodeURIComponent(message)}`);
    }
  }

  if ((route === "/api/mock-data" || route === "/api/catalog") && method === "GET") {
    return Response.json(await buildMockApiResponse(await listUsers()));
  }

  if (route === "/api/logs" && method === "GET") {
    const limit = Number(searchParams.get("limit") ?? "50");
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 200) : 50;
    return Response.json({ logs: await listActionLogs({ limit: safeLimit }) });
  }

  if (route === "/api" && method === "GET") {
    return Response.json({
      name: "Qwoted Request Center",
      endpoints: {
        health: "/api/health",
        users: "/api/users",
        posts: "/api/posts",
        catalog: "/api/catalog",
        mockData: "/api/mock-data",
        slackCommands: "/api/slack/commands",
        slackInteractions: "/api/slack/interactions",
        demoNotification: "/api/demo-notification",
        authRegister: "/api/auth/register",
        authLogin: "/api/auth/login",
        authLogout: "/api/auth/logout",
        linkSlack: "/api/link-slack",
        me: "/api/me",
        logs: "/api/logs",
        auth: "/auth",
        connect: "/connect"
      }
    });
  }

  return Response.json({ error: "not found", route, method }, { status: 404 });
}

