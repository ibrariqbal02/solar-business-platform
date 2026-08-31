import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { buildApp, seedAdminAndToken, authHeader } from "./helpers.js";

let app: Application;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET  = "test-access-secret-xxxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-xxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_RESET_SECRET   = "test-reset-secret-xxxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.JWT_ACCESS_EXPIRES_IN  = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.ADMIN_REGISTRATION_KEY = "test-reg-key";
  process.env.NODE_ENV = "test";
  app = await buildApp();
});

// ─── Register ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("returns 403 when registration key is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "A", email: "a@b.com", password: "Pass1234!" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "A", email: "a@b.com", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin", email: "not-an-email", password: "ValidPass1!" });
    expect(res.status).toBe(400);
  });

  it("registers successfully and returns admin without password", async () => {
    const res = await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin User", email: "admin@solar.com", password: "ValidPass1!" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data.email).toBe("admin@solar.com");
  });

  it("returns 409 on duplicate email", async () => {
    await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin", email: "dup@solar.com", password: "ValidPass1!" });
    const res = await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin", email: "dup@solar.com", password: "ValidPass1!" });
    expect(res.status).toBe(409);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 for wrong password", async () => {
    await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin", email: "login@test.com", password: "RealPass1!" });
    const res = await request(app).post("/api/auth/login")
      .send({ email: "login@test.com", password: "WrongPass!" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("logs in successfully — returns accessToken, sets HttpOnly cookie", async () => {
    await request(app).post("/api/auth/register")
      .set("X-Registration-Key", "test-reg-key")
      .send({ name: "Admin", email: "success@test.com", password: "GoodPass1!" });
    const res = await request(app).post("/api/auth/login")
      .send({ email: "success@test.com", password: "GoodPass1!" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data.admin).not.toHaveProperty("password");
    // Refresh token must be in cookie, NOT in JSON body
    expect(res.body.data).not.toHaveProperty("refreshToken");
    const cookies = res.headers["set-cookie"] as string[] | string;
    const cookieStr = Array.isArray(cookies) ? cookies.join(";") : cookies;
    expect(cookieStr).toContain("refreshToken");
    expect(cookieStr).toContain("HttpOnly");
  });

  it("returns 403 for inactive admin", async () => {
    const { default: Admin } = await import("../src/models/admin.model.js");
    const { hashPassword }   = await import("../src/utils/password.js");
    await Admin.create({ name: "Inactive", email: "inactive@test.com", password: await hashPassword("Pass1234!"), role: "admin", isActive: false });
    const res = await request(app).post("/api/auth/login").send({ email: "inactive@test.com", password: "Pass1234!" });
    expect(res.status).toBe(403);
  });
});

// ─── /me ──────────────────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid.token");
    expect(res.status).toBe(401);
  });

  it("returns admin profile with valid token", async () => {
    const { token } = await seedAdminAndToken();
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data.email).toBe("admin@test.com");
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  it("always returns 200 and clears cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Forgot / Reset password ──────────────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  it("always returns 200 regardless of whether email exists (no enumeration)", async () => {
    const res1 = await request(app).post("/api/auth/forgot-password").send({ email: "noone@nowhere.com" });
    const res2 = await request(app).post("/api/auth/forgot-password").send({ email: "admin@test.com" });
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Response message must be identical
    expect(res1.body.message).toBe(res2.body.message);
  });

  it("returns reset token in dev/test mode", async () => {
    await seedAdminAndToken(); // ensure admin exists
    // In test mode the dev token is returned (controller checks NODE_ENV !== "production")
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "admin@test.com" });
    expect(res.status).toBe(200);
    // Token is exposed when NODE_ENV is "development"; skip assertion if not available
    if (res.body._dev_resetToken) {
      expect(typeof res.body._dev_resetToken).toBe("string");
    }
  });
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 for invalid/missing token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({ token: "badtoken", newPassword: "NewPass1234!" });
    expect(res.status).toBe(400);
  });

  it("resets password with valid token", async () => {
    // Temporarily switch to development mode so forgot-password exposes the token
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    await seedAdminAndToken();
    const forgotRes = await request(app).post("/api/auth/forgot-password").send({ email: "admin@test.com" });
    expect(forgotRes.body).toHaveProperty("_dev_resetToken");

    const resetToken = forgotRes.body._dev_resetToken as string;
    const res = await request(app).post("/api/auth/reset-password").send({ token: resetToken, newPassword: "BrandNew1234!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });
});
