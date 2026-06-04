import { listPosts } from "./auth-store";
import { DemoCopy, DemoPost, DemoRequestInput } from "./types";

export type RequestMatchAnalysis = {
  searchText: string;
  searchTokens: string[];
  matchedPost: DemoPost | null;
  matchedPostScore: number;
  allScores: Array<{ postId: string; title: string; score: number; mode: DemoPost["mode"] }>;
};

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

export function analyzeRequestMatch(mode: DemoRequestInput["mode"], input: DemoRequestInput, posts: DemoPost[]): RequestMatchAnalysis {
  const searchText = [input.title, input.description, input.audience, input.category, input.deadline].filter(Boolean).join(" ");
  const searchTokens = tokenizeSearch(searchText);
  const ranked = posts
    .map((post) => ({
      post,
      score: scorePost(post, searchTokens, mode)
    }))
    .sort((left, right) => right.score - left.score);

  const best = ranked.find((entry) => entry.score > 0 && entry.post.mode === mode) ?? ranked[0];

  return {
    searchText,
    searchTokens,
    matchedPost: best?.post ?? null,
    matchedPostScore: best?.score ?? 0,
    allScores: ranked.map((entry) => ({
      postId: entry.post.id,
      title: entry.post.title,
      score: entry.score,
      mode: entry.post.mode
    }))
  };
}

export async function buildDemoCopy(
  input: DemoRequestInput,
  requestBaseUrl: string,
  linkedUser?: { name: string } | null,
  posts: DemoPost[] = []
): Promise<DemoCopy> {
  const requestId = makeRequestId();
  const requestUrl = `${requestBaseUrl.replace(/\/$/, "")}/${requestId}`;
  const catalog = posts.length ? posts : await listPosts();
  const match = analyzeRequestMatch(input.mode, input, catalog);
  const requestLabel = input.mode === "experts" ? "Call for Experts" : "Call for Products";
  const lookingForLabel = input.mode === "experts" ? "Looking for" : "What product are you looking for?";
  const summary = input.audience.trim() || input.description.trim();
  const requestorName = linkedUser?.name ?? "Qwoted user";
  const matchedPost = match.matchedPost;

  const confirmationLines = [
    `OK. Your ${requestLabel} request has been submitted.`,
    "",
    `Topic: ${input.title}`,
    `${lookingForLabel}: ${summary || "Not provided"}`,
    `Deadline: ${input.deadline || "Not provided"}`,
    `Category: ${input.category || "Not provided"}`,
    "",
    `Requested by: ${requestorName}`,
    `View request: ${requestUrl}`
  ];

  if (matchedPost && match.matchedPostScore > 0) {
    confirmationLines.push("", `Matched candidate: ${matchedPost.title}`, `Score: ${match.matchedPostScore}`);
  } else {
    confirmationLines.push("", "No live candidate matched yet.", "Add posts in the Posts section to start matching.");
  }

  const notificationLines = matchedPost
    ? [
        `New pitch received for your request: ${input.title}`,
        "",
        `Matched post: ${matchedPost.title}`,
        matchedPost.summary,
        `View in Qwoted: ${requestUrl}`
      ]
    : [
        `New pitch received for your request: ${input.title}`,
        "",
        "No live candidate matched yet.",
        "Create a post in the Posts section to start receiving replies.",
        `View in Qwoted: ${requestUrl}`
      ];

  return {
    requestId,
    requestUrl,
    confirmation: confirmationLines.join("\n"),
    notification: notificationLines.join("\n"),
    matchedPost,
    matchedPostScore: match.matchedPostScore
  };
}

export async function buildMockApiResponse(users: Array<{ id: string; email: string; name: string }>) {
  const posts = await listPosts();
  return {
    users,
    posts
  };
}
