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

describe("Category CRUD", () => {
  // ── Create ──
  it("POST /api/categories — 401 without auth", async () => {
    const res = await request(app).post("/api/categories").send({ name: "Solar Panels" });
    expect(res.status).toBe(401);
  });

  it("POST /api/categories — 400 when name missing", async () => {
    const res = await request(app).post("/api/categories").set(authHeader(token)).send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/categories — creates successfully", async () => {
    const res = await request(app).post("/api/categories")
      .set(authHeader(token))
      .field("name", "Inverters")
      .field("description", "Solar inverter products");
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Inverters");
    expect(res.body.data.slug).toBe("inverters");
  });

  it("POST /api/categories — 409 on duplicate name", async () => {
    await request(app).post("/api/categories").set(authHeader(token)).field("name", "Batteries");
    const res = await request(app).post("/api/categories").set(authHeader(token)).field("name", "Batteries");
    expect(res.status).toBe(409);
  });

  // ── Get All ──
  it("GET /api/categories — public, returns list with pagination", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
  });

  // ── Get One ──
  it("GET /api/categories/:id — returns category by ID", async () => {
    const create = await request(app).post("/api/categories").set(authHeader(token)).field("name", "Panels");
    const id = create.body.data._id;
    const res = await request(app).get(`/api/categories/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
  });

  it("GET /api/categories/:slug — returns category by slug", async () => {
    await request(app).post("/api/categories").set(authHeader(token)).field("name", "Solar Cables");
    const res = await request(app).get("/api/categories/solar-cables");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("solar-cables");
  });

  // ── Update ──
  it("PUT /api/categories/:id — updates name and regenerates slug", async () => {
    const create = await request(app).post("/api/categories").set(authHeader(token)).field("name", "Old Name");
    const id = create.body.data._id;
    const res = await request(app).put(`/api/categories/${id}`)
      .set(authHeader(token))
      .field("name", "New Name");
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("New Name");
    expect(res.body.data.slug).toBe("new-name");
  });

  // ── Soft Delete ──
  it("DELETE /api/categories/:id — deactivates category", async () => {
    const create = await request(app).post("/api/categories").set(authHeader(token)).field("name", "To Delete");
    const id = create.body.data._id;
    const res = await request(app).delete(`/api/categories/${id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  // ── Restore ──
  it("PATCH /api/categories/:id/restore — restores deactivated category", async () => {
    const create = await request(app).post("/api/categories").set(authHeader(token)).field("name", "To Restore");
    const id = create.body.data._id;
    await request(app).delete(`/api/categories/${id}`).set(authHeader(token));
    const res = await request(app).patch(`/api/categories/${id}/restore`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });
});
