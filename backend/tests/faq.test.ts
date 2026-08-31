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

describe("FAQ CRUD", () => {
  it("POST /api/faqs — 401 without auth", async () => {
    const res = await request(app).post("/api/faqs").send({ question: "Q?", answer: "A" });
    expect(res.status).toBe(401);
  });

  it("POST /api/faqs — 400 missing question", async () => {
    const res = await request(app).post("/api/faqs").set(authHeader(token)).send({ answer: "A" });
    expect(res.status).toBe(400);
  });

  it("POST /api/faqs — creates with defaults", async () => {
    const res = await request(app).post("/api/faqs").set(authHeader(token))
      .send({ question: "How does solar work?", answer: "Photovoltaic effect.", category: "general", order: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.order).toBe(1);
  });

  it("GET /api/faqs — public, ordered by order asc", async () => {
    await request(app).post("/api/faqs").set(authHeader(token)).send({ question: "Q order 5", answer: "A", order: 5 });
    await request(app).post("/api/faqs").set(authHeader(token)).send({ question: "Q order 1", answer: "A", order: 1 });
    const res = await request(app).get("/api/faqs");
    expect(res.status).toBe(200);
    const orders = res.body.data.map((f: any) => f.order) as number[];
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("GET /api/faqs/active — only active FAQs", async () => {
    await request(app).post("/api/faqs").set(authHeader(token)).send({ question: "Active Q", answer: "A" });
    const res = await request(app).get("/api/faqs/active");
    expect(res.status).toBe(200);
    expect(res.body.data.every((f: any) => f.isActive === true)).toBe(true);
  });

  it("PUT /api/faqs/:id — updates FAQ", async () => {
    const create = await request(app).post("/api/faqs").set(authHeader(token))
      .send({ question: "Old Q?", answer: "Old A" });
    const id = create.body.data._id;
    const res = await request(app).put(`/api/faqs/${id}`).set(authHeader(token))
      .send({ question: "New Q?", answer: "New A" });
    expect(res.status).toBe(200);
    expect(res.body.data.question).toBe("New Q?");
  });

  it("DELETE /api/faqs/:id — soft deletes (isActive=false)", async () => {
    const create = await request(app).post("/api/faqs").set(authHeader(token))
      .send({ question: "Delete me?", answer: "Yes" });
    const id = create.body.data._id;
    const res = await request(app).delete(`/api/faqs/${id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("PATCH /api/faqs/reorder — bulk reorders FAQs", async () => {
    const a = await request(app).post("/api/faqs").set(authHeader(token)).send({ question: "A?", answer: "A", order: 10 });
    const b = await request(app).post("/api/faqs").set(authHeader(token)).send({ question: "B?", answer: "B", order: 20 });
    const res = await request(app).patch("/api/faqs/reorder").set(authHeader(token)).send({
      items: [
        { id: a.body.data._id, order: 1 },
        { id: b.body.data._id, order: 2 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/faqs?category=products — category filter", async () => {
    await request(app).post("/api/faqs").set(authHeader(token))
      .send({ question: "Product Q?", answer: "A", category: "products" });
    const res = await request(app).get("/api/faqs?category=products");
    expect(res.status).toBe(200);
    expect(res.body.data.every((f: any) => f.category === "products")).toBe(true);
  });
});
