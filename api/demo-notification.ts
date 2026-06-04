import { buildDemoCopy } from "../src/demo-data";
import { getConfig } from "../src/config";
import { DemoRequestInput } from "../src/types";

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const json = (await request.json().catch(() => ({}))) as Partial<DemoRequestInput>;
  const input: DemoRequestInput = {
    mode: json.mode === "products" ? "products" : "experts",
    title: json.title ?? "Gas prices",
    description: json.description ?? "Media request demo",
    audience: json.audience ?? "Economists or energy experts",
    deadline: json.deadline ?? "Friday",
    category: json.category ?? "Newsroom",
    linkedUser: undefined
  };

  return Response.json(buildDemoCopy(input, config.demoRequestBaseUrl));
}
