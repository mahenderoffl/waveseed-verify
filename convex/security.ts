import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ─── Admin Sessions ──────────────────────────────────────────────────────────
// The browser holds a random session token; only its SHA-256 hash is stored.
// Passwords are never sent again after login.

export const createSession = internalMutation({
  args: { tokenHash: v.string(), role: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    // Opportunistic cleanup of expired sessions
    const now = Date.now();
    const stale = await ctx.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(50);
    for (const s of stale) await ctx.db.delete(s._id);

    await ctx.db.insert("sessions", { ...args, createdAt: now });
  },
});

export const getSessionRole = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    return session.role;
  },
});

export const deleteSession = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Stored in the database so limits hold across server instances and restarts
// (an in-memory Map is reset whenever Convex spins up a new isolate).

/** Milliseconds until `key` is unlocked, or 0 if not locked. */
export const lockedFor = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row) return 0;
    return Math.max(0, row.lockedUntil - Date.now());
  },
});

/**
 * Count one event against `key`. When `max` events happen within `windowMs`,
 * the key is locked for `lockMs`. Returns attempts remaining before lockout.
 */
export const hit = internalMutation({
  args: { key: v.string(), max: v.number(), windowMs: v.number(), lockMs: v.number() },
  handler: async (ctx, { key, max, windowMs, lockMs }) => {
    const now = Date.now();
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!row) {
      await ctx.db.insert("rateLimits", {
        key, count: 1, windowStart: now, lockedUntil: max <= 1 ? now + lockMs : 0,
      });
      return { remaining: max - 1, lockedFor: max <= 1 ? lockMs : 0 };
    }

    const inWindow = now - row.windowStart < windowMs;
    const count = inWindow ? row.count + 1 : 1;
    const windowStart = inWindow ? row.windowStart : now;
    const lockedUntil = count >= max ? now + lockMs : row.lockedUntil;
    await ctx.db.patch(row._id, { count, windowStart, lockedUntil });
    return { remaining: Math.max(0, max - count), lockedFor: Math.max(0, lockedUntil - now) };
  },
});

export const clear = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});
