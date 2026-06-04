export type RequestMode = "experts" | "products";

export type LinkedUser = {
  slack_team_id: string;
  slack_user_id: string;
  qwoted_user_id: string;
  email: string;
};

export type DemoUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  expertise: string[];
};

export type DemoPost = {
  id: string;
  title: string;
  summary: string;
  mode: RequestMode;
  requestedBy: string;
  deadline: string;
  category: string;
  status: "open" | "answered" | "pending";
};

export type DemoRequestInput = {
  mode: RequestMode;
  title: string;
  description: string;
  audience: string;
  deadline: string;
  category: string;
  linkedUser?: LinkedUser | null;
};

export type DemoCopy = {
  confirmation: string;
  notification: string;
  requestId: string;
  requestUrl: string;
};
