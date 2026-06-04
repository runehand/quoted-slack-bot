"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Post = {
  id: string;
  title: string;
  summary: string;
  mode: "experts" | "products";
  requestedBy: string;
  deadline: string;
  category: string;
  status: "open" | "answered" | "pending";
  createdAt?: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  slackTeamId: string | null;
  slackUserId: string | null;
};

export function PostsClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [meResponse, postsResponse] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/posts", { cache: "no-store" })
        ]);

        const meData = meResponse.ok ? ((await meResponse.json()) as { user?: User | null }) : { user: null };
        const postsData = postsResponse.ok ? ((await postsResponse.json()) as { posts?: Post[] }) : { posts: [] };

        if (!active) {
          return;
        }

        setCurrentUser(meData.user ?? null);
        setPosts(postsData.posts ?? []);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return posts;
    }

    return posts.filter((post) => {
      return [post.title, post.summary, post.requestedBy, post.category, post.deadline, post.status, post.mode]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [posts, query]);

  const openCount = posts.filter((post) => post.status === "open").length;

  return (
    <main className="app-shell stack">
      <section className="hero">
        <div className="panel card stack">
          <div className="pill-row">
            <a className="pill" href="/">
              Status
            </a>
            <a className="pill" href="/auth">
              Auth
            </a>
            <a className="pill" href="/connect">
              Connect
            </a>
            <a className="pill" href="/debug">
              Debug
            </a>
          </div>
          <h1>Posts</h1>
          <p className="muted">Create and manage live request posts. Slack matching uses this Mongo-backed catalog.</p>
          <div className="grid two">
            <article className="notice">
              <strong>{posts.length}</strong>
              <div className="muted">Total posts</div>
            </article>
            <article className="notice">
              <strong>{openCount}</strong>
              <div className="muted">Open posts</div>
            </article>
          </div>
        </div>

        <div className="panel card stack">
          <p className="eyebrow">Current account</p>
          {currentUser ? (
            <>
              <h2>{currentUser.name}</h2>
              <p className="muted">{currentUser.email}</p>
              <div className="notice good">
                Slack identity {currentUser.slackTeamId ? "linked" : "not linked"}.
              </div>
            </>
          ) : (
            <>
              <h2>Sign in required</h2>
              <p className="muted">Create or manage posts after you sign in.</p>
              <a className="pill" href="/auth?next=/posts">
                Go to sign in
              </a>
            </>
          )}
        </div>
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <div>
            <p className="eyebrow">Create post</p>
            <h2>New request</h2>
          </div>
          <div className="muted">
            The title is required. Everything else is optional and can be refined later.
          </div>
        </div>

        {error ? <div className="notice bad">{error}</div> : null}
        {success ? <div className="notice good">{success}</div> : null}
        {!currentUser ? (
          <div className="notice">Sign in to create posts.</div>
          ) : (
          <form method="post" action="/api/posts" className="grid two">
            <label>
              Title
              <input name="title" placeholder="Climate change impact on agriculture" required />
            </label>
            <label>
              Post type
              <select name="mode" defaultValue="experts">
                <option value="experts">Call for Experts</option>
                <option value="products">Call for Products</option>
              </select>
            </label>
            <label>
              Category
              <input name="category" placeholder="Newsroom" />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Summary
              <textarea name="summary" placeholder="Add context that helps Slack matching and reply delivery." rows={4} />
            </label>
            <label>
              Deadline
              <input name="deadline" placeholder="Friday" />
            </label>
            <label>
              Status
              <select name="status" defaultValue="open">
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="answered">Answered</option>
              </select>
            </label>
            <div className="muted" style={{ gridColumn: "1 / -1" }}>
              The post will be created for <strong>{currentUser.name}</strong>.
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit">Create post</button>
            </div>
          </form>
        )}
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Live posts</h2>
          </div>
          <label>
            Filter posts
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, summary, category..." />
          </label>
        </div>

        {loading ? <div className="notice">Loading posts...</div> : null}
        {!loading && filteredPosts.length === 0 ? <div className="notice">No posts yet. Create the first request above.</div> : null}

        <div className="stack">
          {filteredPosts.map((post) => (
            <article key={post.id} className="notice">
              <div className="pill-row" style={{ marginTop: 0 }}>
                <span className="pill">{post.mode === "experts" ? "Call for Experts" : "Call for Products"}</span>
                <span className="pill">{post.status}</span>
              </div>
              <h2>{post.title}</h2>
              <p className="muted">{post.summary || "No summary provided."}</p>
              <div className="grid two">
                <div>
                  <strong>Requested by</strong>
                  <div className="muted">{post.requestedBy}</div>
                </div>
                <div>
                  <strong>Deadline / Category</strong>
                  <div className="muted">
                    {post.deadline || "—"} / {post.category || "—"}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
