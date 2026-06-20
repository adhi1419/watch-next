import type { IncomingMessage } from "node:http";

export async function readJSON<T = any>(req: IncomingMessage): Promise<T> {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) throw new ValidationError("Request body is empty");
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ValidationError("Invalid JSON");
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter(f => data[f] === undefined || data[f] === null || data[f] === "");
  if (missing.length) {
    throw new ValidationError(`Missing required fields: ${missing.join(", ")}`);
  }
}
