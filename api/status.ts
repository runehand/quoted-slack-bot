import fs from "node:fs";
import path from "node:path";

function getStatusHtml(): string {
  const filePath = path.join(process.cwd(), "index.html");
  return fs.readFileSync(filePath, "utf8");
}

export default async function handler(): Promise<Response> {
  return new Response(getStatusHtml(), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
