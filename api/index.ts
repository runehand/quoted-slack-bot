export function GET(): Response {
  return Response.json({
    name: "Qwoted Slack Bot Demo",
    endpoints: {
      health: "/api/health",
      users: "/api/users",
      posts: "/api/posts",
      mockData: "/api/mock-data",
      slackCommands: "/api/slack/commands",
      slackInteractions: "/api/slack/interactions",
      demoNotification: "/api/demo-notification"
    }
  });
}
