import crypto from "node:crypto";
import { MongoClient, ObjectId, type Collection } from "mongodb";
import { getConfig } from "./config";
import { DemoPost, LinkedUser, RegisteredUser, RequestMode } from "./types";
import { seedPosts } from "./seed-data";

type UserDocument = {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  qwotedUserId: string;
  slackTeamId: string | null;
  slackUserId: string | null;
  createdAt: string;
  updatedAt: string;
  linkedAt: string | null;
};

type SessionDocument = {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
};

type ActionLogDocument = {
  _id?: ObjectId;
  action: string;
  source: string;
  actorUserId: string | null;
  actorEmail: string | null;
  slackTeamId: string | null;
  slackUserId: string | null;
  status: "ok" | "error";
  summary: string;
  details: Record<string, unknown>;
  createdAt: Date;
};

type PostStatus = "open" | "answered" | "pending";

type PostDocument = {
  _id?: ObjectId;
  ownerUserId: string;
  title: string;
  summary: string;
  mode: RequestMode;
  requestedBy: string;
  deadline: string;
  category: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
};

type AuthUserInput = {
  email: string;
  name: string;
  password: string;
};

type LinkSlackInput = {
  userId: string;
  slackTeamId: string;
  slackUserId: string;
};

type CreatePostInput = {
  ownerUserId: string;
  title: string;
  summary?: string;
  mode: RequestMode;
  requestedBy: string;
  deadline?: string;
  category?: string;
  status?: PostStatus;
};

type GlobalMongoState = {
  clientPromise?: Promise<MongoClient>;
  indexesPromise?: Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __qwotedMongo: GlobalMongoState | undefined;
}

function getGlobalState(): GlobalMongoState {
  globalThis.__qwotedMongo ??= {};
  return globalThis.__qwotedMongo;
}

async function getMongoClient(): Promise<MongoClient> {
  const state = getGlobalState();
  const config = getConfig();

  if (!config.mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  state.clientPromise ??= new MongoClient(config.mongoUri).connect();
  return state.clientPromise;
}

async function ensureIndexes(): Promise<void> {
  const state = getGlobalState();

  state.indexesPromise ??= (async () => {
    const client = await getMongoClient();
    const database = client.db();
    const users = database.collection<UserDocument>("users");
    const sessions = database.collection<SessionDocument>("sessions");
    const logs = database.collection<ActionLogDocument>("action_logs");
    const posts = database.collection<PostDocument>("posts");

    await Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      users.createIndex(
        { slackTeamId: 1, slackUserId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            slackTeamId: { $type: "string" },
            slackUserId: { $type: "string" }
          }
        }
      ),
      sessions.createIndex({ token: 1 }, { unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      posts.createIndex({ createdAt: -1 }),
      posts.createIndex({ ownerUserId: 1, createdAt: -1 }),
      posts.createIndex({ mode: 1, status: 1, createdAt: -1 }),
      logs.createIndex({ createdAt: -1 }),
      logs.createIndex({ action: 1, createdAt: -1 }),
      logs.createIndex({ source: 1, createdAt: -1 })
    ]);
  })();

  await state.indexesPromise;
}

async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const client = await getMongoClient();
  await ensureIndexes();
  return client.db().collection<UserDocument>("users");
}

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const client = await getMongoClient();
  await ensureIndexes();
  return client.db().collection<SessionDocument>("sessions");
}

async function getActionLogsCollection(): Promise<Collection<ActionLogDocument>> {
  const client = await getMongoClient();
  await ensureIndexes();
  return client.db().collection<ActionLogDocument>("action_logs");
}

async function getPostsCollection(): Promise<Collection<PostDocument>> {
  const client = await getMongoClient();
  await ensureIndexes();
  return client.db().collection<PostDocument>("posts");
}

async function ensureSeedPosts(posts: Collection<PostDocument>): Promise<void> {
  const count = await posts.countDocuments();
  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();
  await posts.insertMany(
    seedPosts.map((post, index) => ({
      ownerUserId: `seed-post-owner-${index + 1}`,
      title: post.title,
      summary: post.summary,
      mode: post.mode,
      requestedBy: post.requestedBy,
      deadline: post.deadline,
      category: post.category,
      status: post.status,
      createdAt: now,
      updatedAt: now
    }))
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, buffer) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(buffer as Buffer);
    });
  });

  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, keyHex] = hash.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const stored = Buffer.from(keyHex, "hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, stored.length, (error, buffer) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(buffer as Buffer);
    });
  });

  if (derivedKey.length !== stored.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, stored);
}

function toRegisteredUser(document: UserDocument, id?: string): RegisteredUser {
  return {
    id: id ?? String(document._id),
    email: document.email,
    name: document.name,
    qwotedUserId: document.qwotedUserId,
    slackTeamId: document.slackTeamId,
    slackUserId: document.slackUserId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    linkedAt: document.linkedAt
  };
}

function toLinkedUser(document: UserDocument, id: string): LinkedUser {
  return {
    id,
    email: document.email,
    name: document.name,
    qwotedUserId: document.qwotedUserId,
    slackTeamId: document.slackTeamId ?? "",
    slackUserId: document.slackUserId ?? ""
  };
}

function toPostRecord(document: PostDocument, id?: string): DemoPost {
  return {
    id: id ?? String(document._id),
    ownerUserId: document.ownerUserId,
    title: document.title,
    summary: document.summary,
    mode: document.mode,
    requestedBy: document.requestedBy,
    deadline: document.deadline,
    category: document.category,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

export async function listUsers(): Promise<RegisteredUser[]> {
  const users = await getUsersCollection();
  const documents = await users.find({}).sort({ createdAt: -1 }).toArray();
  return documents.map((document) => toRegisteredUser(document, String(document._id)));
}

export async function listPosts(): Promise<DemoPost[]> {
  const posts = await getPostsCollection();
  await ensureSeedPosts(posts);
  const documents = await posts.find({}).sort({ createdAt: -1 }).toArray();
  return documents.map((document) => toPostRecord(document, String(document._id)));
}

export async function createPost(input: CreatePostInput): Promise<DemoPost> {
  const posts = await getPostsCollection();
  await ensureSeedPosts(posts);
  const now = new Date().toISOString();
  const title = input.title.trim();

  if (!input.ownerUserId || !title) {
    throw new Error("Owner and title are required.");
  }

  const document: PostDocument = {
    ownerUserId: input.ownerUserId,
    title,
    summary: input.summary?.trim() ?? "",
    mode: input.mode,
    requestedBy: input.requestedBy.trim(),
    deadline: input.deadline?.trim() ?? "",
    category: input.category?.trim() ?? "",
    status: input.status ?? "open",
    createdAt: now,
    updatedAt: now
  };

  const result = await posts.insertOne(document);
  return toPostRecord(document, String(result.insertedId));
}

export async function findUserByEmail(email: string): Promise<RegisteredUser | null> {
  const users = await getUsersCollection();
  const document = await users.findOne({ email: normalizeEmail(email) });
  if (!document) {
    return null;
  }

  return toRegisteredUser(document, String(document._id));
}

export async function findUserById(userId: string): Promise<RegisteredUser | null> {
  const users = await getUsersCollection();
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const document = await users.findOne({ _id: new ObjectId(userId) });
  if (!document) {
    return null;
  }

  return toRegisteredUser(document, String(document._id));
}

export async function createUser(input: AuthUserInput): Promise<RegisteredUser> {
  const users = await getUsersCollection();
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const trimmedName = input.name.trim();
  const password = input.password;

  if (!normalizedEmail || !trimmedName || !password) {
    throw new Error("Name, email, and password are required.");
  }

  const existing = await users.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error("Email already exists.");
  }

  const document: UserDocument = {
    email: normalizedEmail,
    name: trimmedName,
    passwordHash: await hashPassword(password),
    qwotedUserId: `demo-user-${crypto.randomBytes(6).toString("hex")}`,
    slackTeamId: null,
    slackUserId: null,
    createdAt: now,
    updatedAt: now,
    linkedAt: null
  };

  const result = await users.insertOne(document);
  return toRegisteredUser(document, String(result.insertedId));
}

export async function authenticateUser(email: string, password: string): Promise<RegisteredUser | null> {
  if (!email.trim() || !password) {
    return null;
  }

  const users = await getUsersCollection();
  const document = await users.findOne({ email: normalizeEmail(email) });
  if (!document) {
    return null;
  }

  const valid = await verifyPassword(password, document.passwordHash);
  if (!valid) {
    return null;
  }

  return toRegisteredUser(document, String(document._id));
}

export async function createSession(userId: string): Promise<string> {
  const sessions = await getSessionsCollection();
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const document: SessionDocument = {
    token,
    userId,
    createdAt: now,
    expiresAt
  };

  await sessions.insertOne(document);
  return token;
}

export async function findUserBySession(token: string | undefined): Promise<RegisteredUser | null> {
  if (!token) {
    return null;
  }

  const sessions = await getSessionsCollection();
  const users = await getUsersCollection();
  const session = await sessions.findOne({ token });
  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await sessions.deleteOne({ token });
    return null;
  }

  if (!ObjectId.isValid(session.userId)) {
    return null;
  }

  const document = await users.findOne({ _id: new ObjectId(session.userId) });
  if (!document) {
    return null;
  }

  return toRegisteredUser(document, String(document._id));
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }

  const sessions = await getSessionsCollection();
  await sessions.deleteOne({ token });
}

export async function linkSlackAccount(input: LinkSlackInput): Promise<LinkedUser | null> {
  const users = await getUsersCollection();
  if (!ObjectId.isValid(input.userId) || !input.slackTeamId || !input.slackUserId) {
    return null;
  }

  const now = new Date().toISOString();
  const updated = await users.findOneAndUpdate(
    { _id: new ObjectId(input.userId) },
    {
      $set: {
        slackTeamId: input.slackTeamId,
        slackUserId: input.slackUserId,
        linkedAt: now,
        updatedAt: now
      }
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    return null;
  }

  return toLinkedUser(updated, input.userId);
}

export async function findLinkedUser(teamId: string | undefined, userId: string | undefined): Promise<LinkedUser | null> {
  if (!teamId || !userId) {
    return null;
  }

  const users = await getUsersCollection();
  const document = await users.findOne({ slackTeamId: teamId, slackUserId: userId });
  if (!document) {
    return null;
  }

  return toLinkedUser(document, String(document._id));
}

export type ActionLogInput = {
  action: string;
  source: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  slackTeamId?: string | null;
  slackUserId?: string | null;
  status?: "ok" | "error";
  summary: string;
  details?: Record<string, unknown>;
};

export type ActionLogQuery = {
  limit?: number;
};

export async function appendActionLog(input: ActionLogInput): Promise<void> {
  const logs = await getActionLogsCollection();
  const createdAt = new Date();
  await logs.insertOne({
    action: input.action,
    source: input.source,
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    slackTeamId: input.slackTeamId ?? null,
    slackUserId: input.slackUserId ?? null,
    status: input.status ?? "ok",
    summary: input.summary,
    details: input.details ?? {},
    createdAt
  });
}

export async function listActionLogs(query: ActionLogQuery = {}): Promise<Array<ActionLogDocument & { id: string }>> {
  const logs = await getActionLogsCollection();
  const documents = await logs.find({}).sort({ createdAt: -1 }).limit(query.limit ?? 50).toArray();
  return documents.map((document) => ({
    id: String(document._id),
    ...document
  }));
}
