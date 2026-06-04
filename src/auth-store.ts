import crypto from "node:crypto";
import { MongoClient, ObjectId, type Collection } from "mongodb";
import { getConfig } from "./config";
import { LinkedUser, RegisteredUser } from "./types";

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
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
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

export async function listUsers(): Promise<RegisteredUser[]> {
  const users = await getUsersCollection();
  const documents = await users.find({}).sort({ createdAt: -1 }).toArray();
  return documents.map((document) => toRegisteredUser(document, String(document._id)));
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
