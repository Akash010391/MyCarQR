import { Router } from "express";
import { db, legalPagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const ALLOWED_SLUGS = ["about", "privacy", "terms", "refund", "shipping", "disclaimer"] as const;
type AllowedSlug = (typeof ALLOWED_SLUGS)[number];

function isAllowedSlug(s: string): s is AllowedSlug {
  return (ALLOWED_SLUGS as readonly string[]).includes(s);
}

router.get("/legal", async (_req, res) => {
  const rows = await db.select({ slug: legalPagesTable.slug, title: legalPagesTable.title, updatedAt: legalPagesTable.updatedAt }).from(legalPagesTable).orderBy(asc(legalPagesTable.slug));
  res.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
});

router.get("/legal/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  if (!isAllowedSlug(slug)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const [row] = await db.select().from(legalPagesTable).where(eq(legalPagesTable.slug, slug));
  if (!row) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

router.put("/admin/legal/:slug", requireAuth, requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  if (!isAllowedSlug(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }
  const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 200) : "";
  const content = typeof req.body?.content === "string" ? req.body.content.slice(0, 100_000) : "";
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const now = new Date();
  await db
    .insert(legalPagesTable)
    .values({ slug, title, content, updatedAt: now })
    .onConflictDoUpdate({ target: legalPagesTable.slug, set: { title, content, updatedAt: now } });
  res.json({ ok: true });
});

export default router;
