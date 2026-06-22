import { getAuth } from "firebase-admin/auth";
import type { IncomingMessage } from "node:http";

export interface AuthContext {
  uid: string;
  email: string | undefined;
}

export async function authenticate(req: IncomingMessage): Promise<AuthContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);

  // Dev bypass — only in development, never in production
  if (process.env.NODE_ENV === "development" && token === "dev-bypass-token") {
    return { uid: "qunj91td0bU76Kvr5AGj05DSUcs2", email: "dev@local" };
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
