import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Document queries ─────────────────────────────────────────────────────────

export const getByEmployee = internalQuery({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();
  },
});

export const getByEmployeeAndType = internalQuery({
  args: { employeeId: v.id("employees"), docType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_emp_type", (q) =>
        q.eq("employeeId", args.employeeId).eq("docType", args.docType)
      )
      .first();
  },
});

export const getDocumentById = internalQuery({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Document mutations ───────────────────────────────────────────────────────

export const upsertDocument = internalMutation({
  args: {
    employeeId:   v.id("employees"),
    docType:      v.string(),
    storageId:    v.string(),
    fileName:     v.string(),
    mimeType:     v.string(),
    sizeBytes:    v.number(),
    uploadedByIp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Replace existing document of same type for this person
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_emp_type", (q) =>
        q.eq("employeeId", args.employeeId).eq("docType", args.docType)
      )
      .first();

    if (existing) {
      // Delete the old storage blob first
      try { await ctx.storage.delete(existing.storageId as any); } catch {}
      await ctx.db.patch(existing._id, {
        storageId:    args.storageId,
        fileName:     args.fileName,
        mimeType:     args.mimeType,
        sizeBytes:    args.sizeBytes,
        uploadedAt:   Date.now(),
        uploadedByIp: args.uploadedByIp,
      });
      return existing._id;
    }

    return await ctx.db.insert("documents", {
      employeeId:   args.employeeId,
      docType:      args.docType,
      storageId:    args.storageId,
      fileName:     args.fileName,
      mimeType:     args.mimeType,
      sizeBytes:    args.sizeBytes,
      uploadedAt:   Date.now(),
      uploadedByIp: args.uploadedByIp,
    });
  },
});

export const deleteDocument = internalMutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return;
    try { await ctx.storage.delete(doc.storageId as any); } catch {}
    await ctx.db.delete(args.id);
  },
});
