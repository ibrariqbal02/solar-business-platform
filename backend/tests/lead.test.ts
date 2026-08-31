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

describe("Lead submission (public)", () => {
  it("POST /api/leads — 400 missing required fields", async () => {
    const res = await request(app).post("/api/leads").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/leads — 400 invalid type", async () => {
    const res = await request(app).post("/api/leads").send({
      type: "unknown_type", customerName: "Ali", customerPhone: "03001234567",
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/leads — contact enquiry submitted successfully", async () => {
    const res = await request(app).post("/api/leads").send({
      type:          "contact",
      customerName:  "Ahmed Khan",
      customerPhone: "03001234567",
      data:          { subject: "General query", message: "Hello, I need info." },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe("contact");
  });

  it("POST /api/leads — product enquiry requires productId", async () => {
    const res = await request(app).post("/api/leads").send({
      type: "product_enquiry", customerName: "Ali", customerPhone: "0300111",
      data: {},
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/productId/);
  });

  it("POST /api/leads — product enquiry succeeds with productId", async () => {
    const res = await request(app).post("/api/leads").send({
      type: "product_enquiry", customerName: "Bilal", customerPhone: "03009876543",
      data: { productId: "6507f1aa7bffc13ae0000001", quantity: 2 },
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/leads — site visit enquiry works", async () => {
    const res = await request(app).post("/api/leads").send({
      type: "site_visit", customerName: "Sara", customerPhone: "03001111111",
      data: { city: "Lahore", area: "DHA", serviceRequired: "Installation assessment" },
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/leads — technical support requires problem", async () => {
    const res = await request(app).post("/api/leads").send({
      type: "technical_support", customerName: "Umar", customerPhone: "03002222222",
      data: {},
    });
    expect(res.status).toBe(400);
  });
});

describe("Lead management (admin)", () => {
  it("GET /api/leads — 401 without auth", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  it("GET /api/leads — returns all leads paginated", async () => {
    // Seed a lead
    await request(app).post("/api/leads").send({
      type: "contact", customerName: "Test User", customerPhone: "03000000000",
      data: { message: "Hello" },
    });
    const res = await request(app).get("/api/leads").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty("total");
  });

  it("GET /api/leads?type=contact — filters by type", async () => {
    const res = await request(app).get("/api/leads?type=contact").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.every((l: any) => l.type === "contact")).toBe(true);
  });

  it("PUT /api/leads/:id — updates status", async () => {
    const submit = await request(app).post("/api/leads").send({
      type: "contact", customerName: "Status Test", customerPhone: "03000000001",
      data: { message: "Status test" },
    });
    const id = submit.body.data._id;
    const res = await request(app).put(`/api/leads/${id}`).set(authHeader(token))
      .send({ status: "contacted", adminNote: "Called the customer" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("contacted");
  });

  it("PUT /api/leads/:id — 400 for invalid status", async () => {
    const submit = await request(app).post("/api/leads").send({
      type: "contact", customerName: "Invalid Status", customerPhone: "03000000002",
      data: { message: "Bad status test" },
    });
    const id = submit.body.data._id;
    const res = await request(app).put(`/api/leads/${id}`).set(authHeader(token)).send({ status: "unknown" });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/leads/:id — admin deletes lead", async () => {
    const submit = await request(app).post("/api/leads").send({
      type: "contact", customerName: "Delete Lead", customerPhone: "03000000003",
      data: { message: "Delete me" },
    });
    const id = submit.body.data._id;
    const res = await request(app).delete(`/api/leads/${id}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });
});
