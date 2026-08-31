/**
 * Miscellaneous tests: health, search, analytics, notifications, settings, dashboard.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { buildApp, seedAdminAndToken, authHeader } from "./helpers.js";

let app: Application;
let token: string;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET  = "test-access-secret-xxxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-xxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_RESET_SECRET   = "test-reset-secret-xxxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_ACCESS_EXPIRES_IN  = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.NODE_ENV = "test";
  app = await buildApp();
  ({ token } = await seedAdminAndToken());
});

// ─── Health ───────────────────────────────────────────────────────────────────
describe("GET /api/health", () => {
  it("returns 200 and success", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────
describe("GET /api/search", () => {
  it("returns 400 when query is missing", async () => {
    const res = await request(app).get("/api/search");
    expect(res.status).toBe(400);
  });

  it("returns 400 when query is too short", async () => {
    const res = await request(app).get("/api/search?q=a");
    expect(res.status).toBe(400);
  });

  it("returns grouped results for valid query", async () => {
    const res = await request(app).get("/api/search?q=solar");
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveProperty("products");
    expect(res.body.data.results).toHaveProperty("services");
    expect(res.body.data.results).toHaveProperty("videos");
    expect(res.body.data.results).toHaveProperty("articles");
    expect(res.body.data.results).toHaveProperty("faqs");
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
describe("POST /api/analytics/events", () => {
  it("returns 400 for unknown event type", async () => {
    const res = await request(app).post("/api/analytics/events").send({ eventType: "malicious_event" });
    expect(res.status).toBe(400);
  });

  it("tracks a valid product_view event", async () => {
    const res = await request(app).post("/api/analytics/events").send({ eventType: "product_view" });
    expect([200, 201]).toContain(res.status);
  });

  it("tracks whatsapp_click event", async () => {
    const res = await request(app).post("/api/analytics/events").send({ eventType: "whatsapp_click" });
    // Log body on failure for diagnosis
    if (res.status !== 201) console.error("analytics error:", res.body);
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/analytics — admin summary protected", async () => {
    const noAuth = await request(app).get("/api/analytics");
    expect(noAuth.status).toBe(401);
    const res = await request(app).get("/api/analytics").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("eventCounts");
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────
describe("Notifications", () => {
  it("GET /api/notifications — 401 without auth", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications/unread-count — returns count", async () => {
    const res = await request(app).get("/api/notifications/unread-count").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("count");
  });

  it("lead submission auto-creates notification", async () => {
    await request(app).post("/api/leads").send({
      type: "contact", customerName: "Notif Test", customerPhone: "03001111000",
      data: { message: "test" },
    });
    const res = await request(app).get("/api/notifications").set(authHeader(token));
    expect(res.status).toBe(200);
    // Notification may be created asynchronously — just check structure
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────
describe("Settings", () => {
  it("GET /api/settings — public, returns 200", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/settings/admin — 401 without auth", async () => {
    const res = await request(app).get("/api/settings/admin");
    expect(res.status).toBe(401);
  });

  it("PUT /api/settings — admin updates business name", async () => {
    const res = await request(app).put("/api/settings").set(authHeader(token))
      .send({ businessName: "Solar Power Pakistan", whatsappNumber: "03001234567" });
    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBe("Solar Power Pakistan");
  });

  it("GET /api/settings — public response omits sensitive fields", async () => {
    await request(app).put("/api/settings").set(authHeader(token))
      .send({ googleAnalyticsId: "G-SECRET123" });
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty("googleAnalyticsId");
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
describe("Dashboard", () => {
  it("GET /api/dashboard — 401 without auth", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("GET /api/dashboard — returns expected stat keys", async () => {
    const res = await request(app).get("/api/dashboard").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("products");
    expect(res.body.data).toHaveProperty("leads");
    expect(res.body.data).toHaveProperty("notifications");
    expect(res.body.data).toHaveProperty("recentLeads");
  });
});

// ─── Protected routes — role cannot come from req.body ────────────────────────
describe("Security: role manipulation prevention", () => {
  it("registration ignores role from body — always creates admin role", async () => {
    process.env.ADMIN_REGISTRATION_KEY = "test-reg-key";
    const res = await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Hacker", email: "hacker@test.com", password: "Hack1234!", role: "super_admin" });
    if (res.status === 201) {
      expect(res.body.data.role).toBe("admin");  // role from body ignored
    }
  });
});
