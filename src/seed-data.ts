import { RequestMode } from "./types";

export type SeedPost = {
  title: string;
  summary: string;
  mode: RequestMode;
  requestedBy: string;
  deadline: string;
  category: string;
  status: "open" | "answered" | "pending";
};

export const seedPosts: SeedPost[] = [
  {
    title: "Gas prices and household budgets",
    summary: "A reporter is looking for economists or energy experts to explain the latest price changes.",
    mode: "experts",
    requestedBy: "Qwoted editorial team",
    deadline: "Friday",
    category: "Newsroom",
    status: "open"
  },
  {
    title: "Best laptop for remote newsroom work",
    summary: "Editors want lightweight laptops with strong battery life and quiet keyboards.",
    mode: "products",
    requestedBy: "Qwoted editorial team",
    deadline: "Monday",
    category: "Tech",
    status: "open"
  },
  {
    title: "Small business lending trends",
    summary: "Need a banking or lending expert to comment on loan demand and approval trends.",
    mode: "experts",
    requestedBy: "Qwoted editorial team",
    deadline: "Wednesday",
    category: "Finance",
    status: "open"
  },
  {
    title: "Wireless microphone recommendations",
    summary: "Looking for compact wireless mics with reliable range for field reporting.",
    mode: "products",
    requestedBy: "Qwoted editorial team",
    deadline: "Thursday",
    category: "Audio",
    status: "open"
  },
  {
    title: "Healthcare staffing shortages",
    summary: "Seeking hospital operations experts who can speak to staffing and retention.",
    mode: "experts",
    requestedBy: "Qwoted editorial team",
    deadline: "Today",
    category: "Health",
    status: "open"
  },
  {
    title: "Best podcast recorder",
    summary: "Need a recorder with clean preamps and easy file transfer for reporting travel.",
    mode: "products",
    requestedBy: "Qwoted editorial team",
    deadline: "Next week",
    category: "Audio",
    status: "open"
  },
  {
    title: "Local housing affordability",
    summary: "Looking for housing economists and policy experts who can explain rent pressure.",
    mode: "experts",
    requestedBy: "Qwoted editorial team",
    deadline: "Friday",
    category: "Policy",
    status: "open"
  },
  {
    title: "Mobile hotspot devices",
    summary: "Requesting recommendations for dependable hotspots for travel reporting.",
    mode: "products",
    requestedBy: "Qwoted editorial team",
    deadline: "Tomorrow",
    category: "Connectivity",
    status: "open"
  },
  {
    title: "Climate change impact on agriculture",
    summary: "Seeking an agriculture or climate expert with strong reporting credentials.",
    mode: "experts",
    requestedBy: "Qwoted editorial team",
    deadline: "Tuesday",
    category: "Environment",
    status: "open"
  },
  {
    title: "Desk chair for long edit days",
    summary: "Looking for ergonomic chairs with strong lumbar support for editors.",
    mode: "products",
    requestedBy: "Qwoted editorial team",
    deadline: "Friday",
    category: "Workspace",
    status: "open"
  }
];
