import { internalQuery, internalMutation } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

/** Parent company code. Legacy rows without a businessId belong to it. */
export const PARENT_CODE = "WS";

export async function getBusinessByCode(ctx: { db: DatabaseReader }, code: string) {
  return await ctx.db.query("businesses").withIndex("by_code", (q) => q.eq("code", code)).first();
}

/**
 * Resolve the business a new record belongs to.
 * Explicit id -> that business (must exist and be active). Otherwise the parent company.
 * Returns null only before the first seed has run.
 */
export async function resolveBusiness(ctx: { db: DatabaseReader }, businessId?: Id<"businesses">) {
  if (businessId) {
    const b = await ctx.db.get(businessId);
    if (!b) throw new Error("Unknown business");
    if (!b.active) throw new Error(`Business ${b.code} is inactive`);
    return b;
  }
  return await getBusinessByCode(ctx, PARENT_CODE);
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("businesses").collect();
  },
});

/**
 * One-off, idempotent: create WaveSeed Co. (WS) and WaveSeed Growth (WSG) if missing,
 * then attach every existing certificate / employee that has no businessId to WaveSeed.
 * Run with { dryRun: true } first.
 */
export const seedAndBackfill = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const now = Date.now();
    let ws = await getBusinessByCode(ctx, "WS");
    let wsg = await getBusinessByCode(ctx, "WSG");
    const created: string[] = [];

    if (!ws) {
      created.push("WS");
      if (!dryRun) {
        const id = await ctx.db.insert("businesses", {
          code: "WS", slug: "waveseed", displayName: "WaveSeed Co.",
          legalName: "WaveSeed Co.",
          tagline: "Building Tomorrow's Wave, Today",
          website: "www.waveseed.app", email: "careers@waveseed.app",
          signatoryName: "Mahender Banoth", signatoryTitle: "Founder, CEO",
          active: true, createdAt: now, updatedAt: now,
        });
        ws = await ctx.db.get(id);
      }
    }
    if (!wsg) {
      created.push("WSG");
      if (!dryRun && ws) {
        const id = await ctx.db.insert("businesses", {
          code: "WSG", slug: "waveseed-growth", parentId: ws._id,
          displayName: "WaveSeed Growth",
          active: true, createdAt: now, updatedAt: now,
        });
        wsg = await ctx.db.get(id);
      }
    }

    const certs = (await ctx.db.query("certificates").collect()).filter((c) => !c.businessId);
    const emps = (await ctx.db.query("employees").collect()).filter((e) => !e.businessId);
    if (!dryRun && ws) {
      for (const c of certs) await ctx.db.patch(c._id, { businessId: ws._id });
      for (const e of emps) await ctx.db.patch(e._id, { businessId: ws._id });
    }
    return { dryRun, createdBusinesses: created, certificatesToAttach: certs.length, employeesToAttach: emps.length };
  },
});
