import { Suspense } from "react";
import { PostsClient } from "./posts-client";

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <section className="panel card">Loading posts...</section>
        </main>
      }
    >
      <PostsClient />
    </Suspense>
  );
}
