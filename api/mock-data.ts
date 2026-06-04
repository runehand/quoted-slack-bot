import { buildMockApiResponse } from "../src/demo-data";
import { listUsers } from "../src/auth-store";

export async function GET(): Promise<Response> {
  return Response.json(buildMockApiResponse(await listUsers()));
}
