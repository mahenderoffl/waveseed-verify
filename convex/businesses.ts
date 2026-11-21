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

// ─── Branding: resolution with inheritance ────────────────────────────────────
// Every text/image field may be empty on a venture, meaning "use the parent's".
// The signatory (name + title + signature image) is inherited as ONE unit so a venture
// never prints one person's name with another person's signature.

const TEXT_FIELDS = ["legalName", "tagline", "address", "website", "email", "brandColor"] as const;
type TextField = (typeof TEXT_FIELDS)[number];
const IMAGE_KINDS = { logo: "logoStorageId", seal: "sealStorageId", signature: "signatureStorageId" } as const;
type ImageKind = keyof typeof IMAGE_KINDS;

export const listResolved = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("businesses").collect();
    const byId = new Map(all.map((x) => [x._id, x]));
    const chainOf = (x: (typeof all)[number]) => {
      const out = [x];
      let cur = x;
      for (let i = 0; i < 5 && cur.parentId; i++) {
        const p = byId.get(cur.parentId);
        if (!p) break;
        out.push(p);
        cur = p;
      }
      return out;
    };
    const url = async (id?: string) => (id ? await ctx.storage.getUrl(id as any) : null);

    return await Promise.all(all.map(async (biz) => {
      const chain = chainOf(biz);
      const effective: Record<string, { value: string | null; from: string | null }> = {};
      for (const f of TEXT_FIELDS) {
        const hit = chain.find((c) => (c as any)[f]);
        effective[f] = { value: hit ? ((hit as any)[f] as string) : null, from: hit ? hit.code : null };
      }
      for (const kind of ["logo", "seal"] as const) {
        const field = IMAGE_KINDS[kind];
        const hit = chain.find((c) => (c as any)[field]);
        effective[kind] = { value: hit ? await url((hit as any)[field]) : null, from: hit ? hit.code : null };
      }
      const signer = chain.find((c) => c.signatoryName);
      return {
        id: biz._id,
        code: biz.code,
        slug: biz.slug,
        parentId: biz.parentId ?? null,
        displayName: biz.displayName,
        active: biz.active,
        own: {
          legalName: biz.legalName ?? "", tagline: biz.tagline ?? "", address: biz.address ?? "",
          website: biz.website ?? "", email: biz.email ?? "", brandColor: biz.brandColor ?? "",
          signatoryName: biz.signatoryName ?? "", signatoryTitle: biz.signatoryTitle ?? "",
          logoUrl: await url(biz.logoStorageId), sealUrl: await url(biz.sealStorageId),
          signatureUrl: await url(biz.signatureStorageId),
        },
        effective: {
          ...effective,
          signatory: {
            name: signer?.signatoryName ?? null,
            title: signer?.signatoryTitle ?? null,
            signature: signer ? await url(signer.signatureStorageId) : null,
            from: signer ? signer.code : null,
          },
        },
      };
    }));
  },
});

// ─── Validation ───────────────────────────────────────────────────────────────
function cleanText(label: string, value: string, max: number): string {
  const t = value.replace(/\s+/g, " ").trim();
  if (t.length > max) throw new Error(`${label} is too long (max ${max} characters)`);
  if (/[<>]/.test(t)) throw new Error(`${label} cannot contain < or >`);
  return t;
}

function validateField(f: string, raw: string): string {
  switch (f) {
    case "legalName":      return cleanText("Legal name", raw, 100);
    case "tagline":        return cleanText("Tagline", raw, 120);
    case "signatoryName":  return cleanText("Signatory name", raw, 80);
    case "signatoryTitle": return cleanText("Signatory title", raw, 100);
    case "address": {
      const t = raw.replace(/[ \t]+/g, " ").trim();
      if (t.length > 300) throw new Error("Address is too long (max 300 characters)");
      if (/[<>]/.test(t)) throw new Error("Address cannot contain < or >");
      return t;
    }
    case "website": {
      const t = cleanText("Website", raw, 120).replace(/^https?:\/\//i, "");
      if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(\/\S*)?$/i.test(t) && !/^www\./i.test(t)) throw new Error("Website looks invalid");
      return t;
    }
    case "email": {
      const t = cleanText("Email", raw, 120).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) throw new Error("Email looks invalid");
      return t;
    }
    case "brandColor": {
      const t = raw.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(t)) throw new Error("Brand colour must look like #1a2b3c");
      return t.toLowerCase();
    }
  }
  throw new Error("Unknown field");
}

const nullableStr = v.optional(v.union(v.string(), v.null()));

export const updateBusiness = internalMutation({
  args: {
    id: v.id("businesses"),
    role: v.string(),
    displayName: v.optional(v.string()),
    legalName: nullableStr, tagline: nullableStr, address: nullableStr,
    website: nullableStr, email: nullableStr, brandColor: nullableStr,
    signatoryName: nullableStr, signatoryTitle: nullableStr,
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const biz = await ctx.db.get(args.id);
    if (!biz) throw new Error("Business not found");

    const patch: Record<string, unknown> = {};
    const changed: string[] = [];

    if (args.displayName !== undefined) {
      const name = cleanText("Display name", args.displayName, 80);
      if (!name) throw new Error("Display name cannot be empty");
      if (name !== biz.displayName) { patch.displayName = name; changed.push("displayName"); }
    }
    for (const f of [...TEXT_FIELDS, "signatoryName", "signatoryTitle"] as const) {
      const incoming = (args as any)[f] as string | null | undefined;
      if (incoming === undefined) continue;
      const cleaned = incoming === null ? "" : validateField(f, incoming);
      const current = ((biz as any)[f] as string | undefined) ?? "";
      if (cleaned !== current) { patch[f] = cleaned === "" ? undefined : cleaned; changed.push(f); }
    }
    if (args.active !== undefined && args.active !== biz.active) {
      if (!biz.parentId && !args.active) throw new Error("The parent company cannot be deactivated");
      patch.active = args.active;
      changed.push("active");
    }

    if (changed.length === 0) return { changed: [] as string[] };
    patch.updatedAt = Date.now();
    await ctx.db.patch(args.id, patch as any);
    await ctx.db.insert("businessAuditLogs", { businessId: args.id, action: "update", fields: changed, role: args.role, at: Date.now() });
    return { changed };
  },
});

export const createBusiness = internalMutation({
  args: {
    displayName: v.string(),
    code: v.string(),
    parentId: v.optional(v.id("businesses")),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const name = cleanText("Display name", args.displayName, 80);
    if (!name) throw new Error("Display name is required");
    const code = args.code.trim().toUpperCase();
    if (!/^[A-Z]{2,6}$/.test(code)) throw new Error("Code must be 2–6 capital letters (e.g. WSG)");
    if (await getBusinessByCode(ctx, code)) throw new Error(`Code ${code} is already used`);

    const parent = args.parentId ? await ctx.db.get(args.parentId) : await getBusinessByCode(ctx, PARENT_CODE);
    if (!parent) throw new Error("Parent business not found");

    // Unique url slug
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || code.toLowerCase();
    let slug = base;
    for (let i = 2; await ctx.db.query("businesses").withIndex("by_slug", (q) => q.eq("slug", slug)).first(); i++) slug = `${base}-${i}`;

    const now = Date.now();
    const id = await ctx.db.insert("businesses", { code, slug, parentId: parent._id, displayName: name, active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("businessAuditLogs", { businessId: id, action: "create", fields: ["code", "displayName"], role: args.role, at: now });
    return { id, code, slug };
  },
});

export const setImage = internalMutation({
  args: { id: v.id("businesses"), kind: v.string(), storageId: v.optional(v.string()), role: v.string() },
  handler: async (ctx, args) => {
    if (!(args.kind in IMAGE_KINDS)) throw new Error("Unknown image kind");
    const field = IMAGE_KINDS[args.kind as ImageKind];
    const biz = await ctx.db.get(args.id);
    if (!biz) throw new Error("Business not found");
    const old = (biz as any)[field] as string | undefined;
    if (old && old !== args.storageId) { try { await ctx.storage.delete(old as any); } catch {} }
    await ctx.db.patch(args.id, { [field]: args.storageId, updatedAt: Date.now() } as any);
    await ctx.db.insert("businessAuditLogs", {
      businessId: args.id, action: args.storageId ? "image_set" : "image_clear", fields: [args.kind], role: args.role, at: Date.now(),
    });
  },
});

export const getLogs = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return await ctx.db.query("businessAuditLogs").withIndex("by_business", (q) => q.eq("businessId", businessId)).order("desc").take(30);
  },
});
