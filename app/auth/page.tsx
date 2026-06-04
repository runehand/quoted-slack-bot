import { Suspense } from "react";
import { AuthClient } from "./auth-client";

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="app-shell"><section className="panel card">Loading...</section></main>}>
      <AuthClient />
    </Suspense>
  );
}
