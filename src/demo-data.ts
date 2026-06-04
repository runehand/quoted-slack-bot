import mockData from "./data/mock-data.json";
import { DemoCopy, DemoPost, DemoRequestInput, DemoUser } from "./types";

type DemoData = {
  users: DemoUser[];
  posts: DemoPost[];
};

function loadDemoData(): DemoData {
  if (mockData?.users?.length && mockData?.posts?.length) {
    return mockData as DemoData;
  }

  return {
    users: [
      {
        id: "demo-user-001",
        name: "Avery Chen",
        role: "Reporter",
        email: "reporter@example.com",
        expertise: ["energy", "policy", "markets"]
      }
    ],
    posts: [
      {
        id: "post-001",
        title: "Gas prices and household budgets",
        summary: "A reporter is looking for economists or energy experts to explain the latest price changes.",
        mode: "experts",
        requestedBy: "Avery Chen",
        deadline: "Friday",
        category: "Newsroom",
        status: "open"
      }
    ]
  };
}

function makeRequestId(): string {
  return `demo-${Math.random().toString(36).slice(2, 10)}`;
}

function selectPost(mode: DemoRequestInput["mode"], title: string, posts: DemoPost[]): DemoPost {
  const byMode = posts.find((post) => post.mode === mode && post.title.toLowerCase().includes(title.toLowerCase()));
  if (byMode) {
    return byMode;
  }

  const byModeOnly = posts.find((post) => post.mode === mode);
  if (byModeOnly) {
    return byModeOnly;
  }

  return posts[0];
}

function selectUser(linkedUserEmail: string | undefined, users: DemoUser[]): DemoUser {
  if (linkedUserEmail) {
    const matched = users.find((user) => user.email.toLowerCase() === linkedUserEmail.toLowerCase());
    if (matched) {
      return matched;
    }
  }

  return users[0];
}

export function getDemoUsers(): DemoUser[] {
  return loadDemoData().users;
}

export function getDemoPosts(): DemoPost[] {
  return loadDemoData().posts;
}

export function buildDemoCopy(input: DemoRequestInput, requestBaseUrl: string): DemoCopy {
  const requestId = makeRequestId();
  const requestUrl = `${requestBaseUrl.replace(/\/$/, "")}/${requestId}`;
  const data = loadDemoData();
  const user = selectUser(input.linkedUser?.email, data.users);
  const post = selectPost(input.mode, input.title, data.posts);
  const requestLabel = input.mode === "experts" ? "Call for Experts" : "Call for Products";
  const lookingForLabel = input.mode === "experts" ? "Looking for" : "What product are you looking for?";
  const summary = input.audience.trim() || post.summary;

  return {
    requestId,
    requestUrl,
    confirmation: `✅ Your ${requestLabel} request has been submitted.\n\nTopic: ${input.title}\n${lookingForLabel}: ${summary}\nDeadline: ${input.deadline}\nCategory: ${input.category}\n\nRequested by: ${user.name}\nView request: ${requestUrl}`,
    notification: `🔔 New pitch received for your request: ${input.title}\n\n${post.summary}\nView in Qwoted: ${requestUrl}`
  };
}

export function buildMockApiResponse() {
  const data = loadDemoData();
  return {
    users: data.users,
    posts: data.posts
  };
}
