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
    <main className="app-shell">
      <section className="panel card stack">
        <div>
          <h1>Qwoted account access</h1>
          <p className="muted">Sign up or sign in, then connect your Slack identity.</p>
        </div>

        {currentUser ? (
          <div className="notice good">
            Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}). <a href={nextUrl}>Continue</a>.
          </div>
        ) : null}
        {error ? <div className="notice bad">{error}</div> : null}
        {success ? <div className="notice good">{success}</div> : null}

        <div className="grid two">
          <form method="post" action="/api/auth/register">
            <h2>Sign up</h2>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
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
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <input type="hidden" name="next" value={nextUrl} />
            <button type="submit">Sign in</button>
          </form>
        </div>

        <div className="muted">
          Need to connect Slack after signing in? Return to <a href={authLink}>this page</a>.
        </div>
      </section>
    </main>
  );
}
