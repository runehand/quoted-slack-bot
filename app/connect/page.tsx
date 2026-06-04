import { Suspense } from "react";
import { ConnectClient } from "./connect-client";

export default function ConnectPage() {
  return (
    <Suspense fallback={<main className="app-shell"><section className="panel card">Loading...</section></main>}>
      <ConnectClient />
    </Suspense>
  );
}
