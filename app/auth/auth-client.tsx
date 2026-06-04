"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string;
  slackTeamId: string | null;
  slackUserId: string | null;
};

export function AuthClient() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/connect";
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const authLink = useMemo(() => `/auth?next=${encodeURIComponent(nextUrl)}`, [nextUrl]);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: User | null };
      if (active) {
        setCurrentUser(data.user ?? null);
      }
    }

    void loadUser();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell stack">
      <section className="hero">
        <div className="panel card stack">
          <div className="pill-row">
            <a className="pill" href="/">
              Status
            </a>
            <a className="pill" href="/posts">
              Posts
            </a>
            <a className="pill" href="/debug">
              Debug
            </a>
          </div>
          <div>
            <p className="eyebrow">Qwoted access</p>
            <h1>Secure account access for newsroom workflows</h1>
            <p className="muted">
              Sign in to manage posts, link Slack identities, and keep request handling tied to a real user session.
            </p>
          </div>

          <div className="grid two">
            <article className="notice">
              <strong>Session-based auth</strong>
              <div className="muted">Password-backed sign in with server-side session cookies.</div>
            </article>
            <article className="notice">
              <strong>Slack identity linking</strong>
              <div className="muted">Connect the signed-in account to a Slack team and user ID.</div>
            </article>
          </div>

          {currentUser ? (
            <div className="notice good">
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}).
              <div style={{ marginTop: 10 }}>
                <a className="pill" href={nextUrl}>
                  Continue
                </a>
              </div>
            </div>
          ) : null}
          {error ? <div className="notice bad">{error}</div> : null}
          {success ? <div className="notice good">{success}</div> : null}
        </div>

        <div className="panel card stack">
          <p className="eyebrow">Account status</p>
          {currentUser ? (
            <>
              <h2>{currentUser.name}</h2>
              <p className="muted">{currentUser.email}</p>
              <div className="notice">
                Slack: {currentUser.slackTeamId ? "linked" : "not linked"}
                <br />
                Slack user: {currentUser.slackUserId ?? "not linked"}
              </div>
              <form method="post" action="/api/auth/logout">
                <button type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <h2>Ready when you are</h2>
              <p className="muted">Create an account or sign in to continue to Slack linking.</p>
              <div className="notice">After sign in, you’ll be redirected to <code>{nextUrl}</code>.</div>
            </>
          )}
        </div>
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <div>
            <p className="eyebrow">Access controls</p>
            <h2>Sign in or create an account</h2>
          </div>
          <div className="muted">Choose the path that matches your workflow. Both use the same session layer.</div>
        </div>

        <div className="grid two">
          <form method="post" action="/api/auth/register">
            <h2>Create account</h2>
            <label>
              Full name
              <input name="name" placeholder="Jordan Lee" required />
            </label>
            <label>
              Work email
              <input name="email" type="email" placeholder="jordan@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <input type="hidden" name="next" value={nextUrl} />
            <button type="submit">Create account</button>
          </form>

          <form method="post" action="/api/auth/login">
            <h2>Sign in</h2>
            <label>
              Email
              <input name="email" type="email" placeholder="jordan@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <input type="hidden" name="next" value={nextUrl} />
            <button type="submit">Sign in</button>
          </form>
        </div>

        <div className="notice">
          Need Slack linking after sign in? Return to <a href={authLink}>this access page</a>.
        </div>
      </section>
    </main>
  );
}
