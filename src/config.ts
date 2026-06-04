import mockUsers from "./data/mock-users.json";
import { LinkedUser } from "./types";

type AppConfig = {
  slackBotToken: string;
  slackSigningSecret: string;
  demoRequestBaseUrl: string;
  demoConnectUrl: string;
  linkedUsers: LinkedUser[];
};

function readLinkedUsers(): LinkedUser[] {
  const fileUsers = mockUsers as LinkedUser[];
  const envValue = process.env.MOCK_LINKED_USERS_JSON;

  if (!envValue) {
    return fileUsers;
  }

  try {
    const envUsers = JSON.parse(envValue) as LinkedUser[];
    return [...fileUsers, ...envUsers];
  } catch {
    return fileUsers;
  }
}

export function getConfig(): AppConfig {
  const slackBotToken = process.env.SLACK_BOT_TOKEN ?? "";
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET ?? "";

  return {
    slackBotToken,
    slackSigningSecret,
    demoRequestBaseUrl: process.env.DEMO_REQUEST_BASE_URL ?? "https://demo.qwoted.com/request",
    demoConnectUrl: process.env.DEMO_CONNECT_URL ?? "https://demo.qwoted.com/connect",
    linkedUsers: readLinkedUsers()
  };
}

export function findLinkedUser(teamId: string | undefined, userId: string | undefined): LinkedUser | null {
  if (!teamId || !userId) {
    return null;
  }

  const config = getConfig();
  return config.linkedUsers.find((user) => user.slack_team_id === teamId && user.slack_user_id === userId) ?? null;
}
