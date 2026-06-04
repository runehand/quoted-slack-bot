"use client";

import { useEffect, useState } from "react";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
            <h1>Sign in or create an account</h1>
            <p className="muted">
              Use a dedicated auth page for each path. Keep the session tied to the newsroom workflow before linking Slack.
            </p>
          </div>

          <div className="grid two">
            <article className="notice">
              <strong>Sign in</strong>
              <div className="muted">Return users continue to a Slack linking step or the posts page.</div>
            </article>
            <article className="notice">
              <strong>Create account</strong>
              <div className="muted">New users create a workspace identity before connecting Slack.</div>
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
        </div>

        <div className="panel card stack">
          <p className="eyebrow">Session status</p>
          {currentUser ? (
            <>
              <h2>{currentUser.name}</h2>
              <p className="muted">{currentUser.email}</p>
              <div className="notice">
                Slack: {currentUser.slackTeamId ? "linked" : "not linked"}
                <br />
                Slack user: {currentUser.slackUserId ?? "not linked"}
              </div>
            </>
          ) : (
            <>
              <h2>No active session</h2>
              <p className="muted">Choose sign in or create account to continue.</p>
            </>
          )}
        </div>
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <a className="notice" href={`/auth/sign-in?next=${encodeURIComponent(nextUrl)}`}>
            <strong>Sign in</strong>
            <div className="muted">Use an existing Qwoted account.</div>
          </a>
          <a className="notice" href={`/auth/sign-up?next=${encodeURIComponent(nextUrl)}`}>
            <strong>Create account</strong>
            <div className="muted">Register a new Qwoted account.</div>
          </a>
        </div>
      </section>
    </main>
  );
}
