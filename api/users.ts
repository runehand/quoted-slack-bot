import { listUsers } from "../src/auth-store";

export async function GET(): Promise<Response> {
  return Response.json({ users: await listUsers() });
}
