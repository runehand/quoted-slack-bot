import mockData from "./data/mock-data.json";
import { DemoCopy, DemoPost, DemoRequestInput } from "./types";

type DemoData = {
  posts: DemoPost[];
};

function loadDemoData(): DemoData {
  if (mockData?.posts?.length) {
    return mockData as DemoData;
  }

  return {
    posts: [
      {
        id: "post-001",
        title: "Gas prices and household budgets",
        summary: "A reporter is looking for economists or energy experts to explain the latest price changes.",
        mode: "experts",
        requestedBy: "Qwoted user",
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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearch(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function scorePost(post: DemoPost, searchTokens: string[], mode: DemoRequestInput["mode"]): number {
  const haystack = normalizeText(
    [
      post.title,
      post.summary,
      post.requestedBy,
      post.deadline,
      post.category,
      post.status,
      post.mode,
      mode
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!searchTokens.length) {
    return post.mode === mode ? 10 : 1;
  }

  let score = post.mode === mode ? 5 : 0;
  for (const token of searchTokens) {
    if (haystack.includes(token)) {
      score += token.length > 3 ? 4 : 2;
    }
  }

  if (normalizeText(post.title).includes(searchTokens.join(" "))) {
    score += 8;
  }

  return score;
}

function selectPost(mode: DemoRequestInput["mode"], input: DemoRequestInput, posts: DemoPost[]): DemoPost {
  const searchText = [input.title, input.description, input.audience, input.category, input.deadline].filter(Boolean).join(" ");
  const searchTokens = tokenizeSearch(searchText);
  const ranked = posts
    .map((post) => ({ post, score: scorePost(post, searchTokens, mode) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked.find((entry) => entry.score > 0 && entry.post.mode === mode);
  if (best) {
    return best.post;
  }

  const anyBest = ranked[0];
  return anyBest?.post ?? posts[0];
}

export function getDemoPosts(): DemoPost[] {
  return loadDemoData().posts;
}

export function buildDemoCopy(
  input: DemoRequestInput,
  requestBaseUrl: string,
  linkedUser?: { name: string } | null
): DemoCopy {
  const requestId = makeRequestId();
  const requestUrl = `${requestBaseUrl.replace(/\/$/, "")}/${requestId}`;
  const data = loadDemoData();
  const post = selectPost(input.mode, input, data.posts);
  const requestLabel = input.mode === "experts" ? "Call for Experts" : "Call for Products";
  const lookingForLabel = input.mode === "experts" ? "Looking for" : "What product are you looking for?";
  const summary = input.audience.trim() || input.description.trim() || post.summary;
  const requestorName = linkedUser?.name ?? "Qwoted user";

  return {
    requestId,
    requestUrl,
    confirmation: `OK. Your ${requestLabel} request has been submitted.\n\nTopic: ${input.title}\n${lookingForLabel}: ${summary}\nDeadline: ${input.deadline}\nCategory: ${input.category}\n\nRequested by: ${requestorName}\nView request: ${requestUrl}`,
    notification: `New pitch received for your request: ${input.title}\n\nMatched post: ${post.title}\n${post.summary}\nView in Qwoted: ${requestUrl}`
  };
}

export function buildMockApiResponse(users: Array<{ id: string; email: string; name: string }>) {
  const data = loadDemoData();
  return {
    users,
    posts: data.posts
  };
}
