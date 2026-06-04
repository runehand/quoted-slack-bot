type AppConfig = {
  slackBotToken: string;
  slackSigningSecret: string;
  mongoUri: string;
  appBaseUrl: string;
  demoRequestBaseUrl: string;
  sessionCookieName: string;
};

export function getConfig(): AppConfig {
  const slackBotToken = process.env.SLACK_BOT_TOKEN ?? "";
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET ?? "";
  const mongoUri = process.env.MONGODB_URI ?? "";
  const appBaseUrl =
    process.env.APP_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return {
    slackBotToken,
    slackSigningSecret,
    mongoUri,
    appBaseUrl,
    demoRequestBaseUrl: process.env.DEMO_REQUEST_BASE_URL ?? "https://demo.qwoted.com/request",
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "qwoted_session"
  };
}
