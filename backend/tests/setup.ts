/**
 * Global test setup — runs once before all test files via vitest setupFiles.
 * Starts mongodb-memory-server and connects mongoose.
 * Mocks Cloudinary so no real uploads happen during tests.
 * Mocks nodemailer so no real emails are sent during tests.
 */
import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// ── Cloudinary mock (prevent real uploads) ───────────────────────────────────
vi.mock("../src/config/cloudinary.js", () => ({
  connectCloudinary: vi.fn(),
  cloudinary: {
    uploader: {
      upload_stream: vi.fn((_opts: unknown, cb: Function) => {
        cb(null, { secure_url: "https://cloudinary.test/image.jpg", public_id: "test/image", format: "jpg", width: 800, height: 600, bytes: 12345 });
        return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
      }),
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
    config: vi.fn(),
  },
}));

// ── Nodemailer mock (prevent real SMTP connections) ───────────────────────────
// Intercepts nodemailer.createTransport so sendEmail() never opens a real socket.
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    })),
  },
}));

// ── In-memory MongoDB ─────────────────────────────────────────────────────────
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clean all collections between tests for isolation.
  // Skip Admin and RefreshToken so auth tokens stay valid within a test suite.
  const keep = new Set(["admins", "refreshtokens"]);
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.entries(collections)
      .filter(([name]) => !keep.has(name.toLowerCase()))
      .map(([, c]) => c.deleteMany({}))
  );
});
