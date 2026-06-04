"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  mode: "sign-in" | "sign-up";
};

export function AuthFormClient({ mode }: Props) {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/connect";
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const title = mode === "sign-in" ? "Sign in" : "Create account";
  const action = mode === "sign-in" ? "/api/auth/login" : "/api/auth/register";
  const oppositeHref =
    mode === "sign-in"
      ? `/auth/sign-up?next=${encodeURIComponent(nextUrl)}`
      : `/auth/sign-in?next=${encodeURIComponent(nextUrl)}`;
  const oppositeLabel = mode === "sign-in" ? "Create an account" : "Sign in";

  const pageCopy = useMemo(() => {
    if (mode === "sign-in") {
      return "Use your existing Qwoted account to continue to Slack linking or manage live posts.";
    }

    return "Create a Qwoted account before linking Slack or managing live posts.";
  }, [mode]);

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
            <a className="pill" href="/auth">
              Auth home
            </a>
          </div>
          <div>
            <p className="eyebrow">Qwoted access</p>
            <h1>{title}</h1>
            <p className="muted">{pageCopy}</p>
          </div>

          {error ? <div className="notice bad">{error}</div> : null}
          {success ? <div className="notice good">{success}</div> : null}

          <form method="post" action={action}>
            {mode === "sign-up" ? (
              <label>
                Full name
                <input name="name" placeholder="Jordan Lee" required />
              </label>
            ) : null}
            <label>
              Email
              <input name="email" type="email" placeholder="jordan@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <input type="hidden" name="next" value={nextUrl} />
            <button type="submit">{title}</button>
          </form>
        </div>

        <div className="panel card stack">
          <p className="eyebrow">Need a different path?</p>
          <h2>{oppositeLabel}</h2>
          <p className="muted">
            {mode === "sign-in"
              ? "If you do not have an account yet, register first and then return here to connect Slack."
              : "If your account already exists, use sign in instead."}
          </p>
          <a className="pill" href={oppositeHref}>
            {oppositeLabel}
          </a>
        </div>
      </section>
    </main>
  );
}
