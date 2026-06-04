export type RequestMode = "experts" | "products";

export type LinkedUser = {
  id: string;
  email: string;
  name: string;
  qwotedUserId: string;
  slackTeamId: string;
  slackUserId: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  qwotedUserId: string;
  slackTeamId: string | null;
  slackUserId: string | null;
  createdAt: string;
  updatedAt: string;
  linkedAt: string | null;
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
