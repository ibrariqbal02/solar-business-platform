import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/** Hash a plaintext password */
export const hashPassword = async (plaintext: string): Promise<string> => {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
};

/** Securely compare a plaintext password against a stored hash */
export const comparePassword = async (plaintext: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plaintext, hash);
};

/** Generate a cryptographically random opaque token (hex string) */
export const generateRandomToken = (byteLength = 32): string => {
  return crypto.randomBytes(byteLength).toString("hex");
};

/** SHA-256 hash a token for safe storage (never store raw tokens in DB) */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/** Generate a UUID-style unique ID for use as JWT jti claim */
export const generateJti = (): string => {
  return crypto.randomUUID();
};
