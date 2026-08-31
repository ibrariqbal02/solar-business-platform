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

describe("Testimonial", () => {
  it("POST /api/testimonials — public submit, defaults to pending", async () => {
    const res = await request(app).post("/api/testimonials")
      .field("customerName", "Hafiz Usman")
      .field("review",       "Excellent solar products!")
      .field("rating",       "5");
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.isVisible).toBe(false);
  });

  it("POST /api/testimonials — 400 missing review", async () => {
    const res = await request(app).post("/api/testimonials").field("customerName", "A").field("rating", "4");
    expect(res.status).toBe(400);
  });

  it("POST /api/testimonials — 400 rating out of range", async () => {
    const res = await request(app).post("/api/testimonials")
      .field("customerName", "A").field("review", "Good").field("rating", "6");
    expect(res.status).toBe(400);
  });

  it("GET /api/testimonials — public, only approved & visible", async () => {
    // Submit then approve one
    const submit = await request(app).post("/api/testimonials")
      .field("customerName", "Visible Customer").field("review", "5 stars").field("rating", "5");
    const id = submit.body.data._id;
    await request(app).patch(`/api/testimonials/${id}/approve`).set(authHeader(token));

    const res = await request(app).get("/api/testimonials");
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.status === "approved" && t.isVisible === true)).toBe(true);
  });

  it("GET /api/testimonials/admin — admin sees all", async () => {
    const res = await request(app).get("/api/testimonials/admin").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("PATCH /api/testimonials/:id/approve — admin approves and makes visible", async () => {
    const submit = await request(app).post("/api/testimonials")
      .field("customerName", "Pending User").field("review", "Good service").field("rating", "4");
    const id = submit.body.data._id;
    const res = await request(app).patch(`/api/testimonials/${id}/approve`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(res.body.data.isVisible).toBe(true);
  });

  it("PATCH /api/testimonials/:id/visibility — toggles visibility", async () => {
    const submit = await request(app).post("/api/testimonials")
      .field("customerName", "Toggle User").field("review", "Nice").field("rating", "3");
    const id = submit.body.data._id;
    const res = await request(app).patch(`/api/testimonials/${id}/visibility`)
      .set(authHeader(token)).send({ isVisible: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isVisible).toBe(true);
  });

  it("DELETE /api/testimonials/:id — admin deletes", async () => {
    const submit = await request(app).post("/api/testimonials")
      .field("customerName", "Delete User").field("review", "Okay").field("rating", "3");
    const id = submit.body.data._id;
    const res = await request(app).delete(`/api/testimonials/${id}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });
});
