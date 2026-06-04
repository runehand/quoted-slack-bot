import { Suspense } from "react";
import { AuthFormClient } from "../auth-form-client";

export default function SignUpPage() {
  return (
    <Suspense fallback={<main className="app-shell"><section className="panel card">Loading...</section></main>}>
      <AuthFormClient mode="sign-up" />
    </Suspense>
  );
}
