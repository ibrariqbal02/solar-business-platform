/**
 * SEO routes — sitemap.xml and robots.txt.
 *
 * Mounted directly on the app (not under /api) so crawlers can find them at
 * the conventional root paths: /sitemap.xml and /robots.txt.
 *
 * These routes deliberately sit outside the global rate limiter and auth
 * middleware so search engine crawlers are never blocked.
 */
import { Router, Request, Response } from "express";
import Product  from "../models/product.model.js";
import Article  from "../models/article.model.js";
import Service  from "../models/service.model.js";
import WebsiteSettings from "../models/website-settings.model.js";

const router = Router();

// ─── GET /robots.txt ──────────────────────────────────────────────────────────
router.get("/robots.txt", (_req: Request, res: Response): void => {
  res.set("Content-Type", "text/plain");
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "",
      "Sitemap: /sitemap.xml",
    ].join("\n")
  );
});

// ─── GET /sitemap.xml ─────────────────────────────────────────────────────────
router.get("/sitemap.xml", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Resolve the public base URL from ALLOWED_ORIGINS (first entry)
    const baseUrl = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
      .split(",")[0]
      .trim()
      .replace(/\/$/, "");

    // Fetch all public content in parallel
    const [products, articles, services] = await Promise.all([
      Product.find({ isActive: true }).select("slug updatedAt").lean(),
      Article.find({ status: "published" }).select("slug updatedAt").lean(),
      Service.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);

    // Static pages — add/remove as the frontend grows
    const staticPages: Array<{ path: string; priority: string; changefreq: string }> = [
      { path: "/",             priority: "1.0", changefreq: "weekly"  },
      { path: "/products",     priority: "0.9", changefreq: "daily"   },
      { path: "/services",     priority: "0.9", changefreq: "weekly"  },
      { path: "/articles",     priority: "0.8", changefreq: "daily"   },
      { path: "/contact",      priority: "0.7", changefreq: "monthly" },
      { path: "/about",        priority: "0.7", changefreq: "monthly" },
      { path: "/privacy-policy",    priority: "0.4", changefreq: "yearly" },
      { path: "/terms-of-service",  priority: "0.4", changefreq: "yearly" },
    ];

    const now = new Date().toISOString().split("T")[0];

    const urlEntries: string[] = [];

    // Static
    for (const page of staticPages) {
      urlEntries.push(
        `  <url>\n    <loc>${baseUrl}${page.path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      );
    }

    // Products
    for (const p of products) {
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt as Date).toISOString().split("T")[0]
        : now;
      urlEntries.push(
        `  <url>\n    <loc>${baseUrl}/products/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    // Articles
    for (const a of articles) {
      const lastmod = a.updatedAt
        ? new Date(a.updatedAt as Date).toISOString().split("T")[0]
        : now;
      urlEntries.push(
        `  <url>\n    <loc>${baseUrl}/articles/${a.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      );
    }

    // Services
    for (const s of services) {
      const lastmod = s.updatedAt
        ? new Date(s.updatedAt as Date).toISOString().split("T")[0]
        : now;
      urlEntries.push(
        `  <url>\n    <loc>${baseUrl}/services/${s.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urlEntries,
      `</urlset>`,
    ].join("\n");

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600"); // 1-hour HTTP cache for crawlers
    res.send(xml);
  } catch (error: any) {
    res.status(500).send("<?xml version='1.0'?><error>Failed to generate sitemap</error>");
  }
});

export default router;
