import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Public Lookups (called from HTTP actions) ────────────────────────────────

export const getByCertificateId = internalQuery({
  args: { certificateId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_certificate_id", (q) =>
        q.eq("certificateId", args.certificateId)
      )
      .unique();
  },
});

export const getByReferenceNumber = internalQuery({
  args: { referenceNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_reference_number", (q) =>
        q.eq("referenceNumber", args.referenceNumber)
      )
      .unique();
  },
});

export const getAllCertificates = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("certificates")
      .order("desc")
      .collect();
  },
});

export const getStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("certificates").collect();
    const active = all.filter((c) => c.status === "active").length;
    const revoked = all.filter((c) => c.status === "revoked").length;
    const expired = all.filter((c) => c.status === "expired").length;
    const totalVerifications = all.reduce((sum, c) => sum + c.verificationCount, 0);
    return { total: all.length, active, revoked, expired, totalVerifications };
  },
});

// ─── Internal Mutations (called from HTTP actions) ────────────────────────────

export const incrementVerificationCount = internalMutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.id);
    if (cert) {
      await ctx.db.patch(args.id, {
        verificationCount: cert.verificationCount + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

export const insertCertificate = internalMutation({
  args: {
    certificateId: v.string(),
    referenceNumber: v.string(),
    holderName: v.string(),
    holderEmail: v.optional(v.string()),
    holderInstitution: v.optional(v.string()),
    holderDepartment: v.optional(v.string()),
    holderDob: v.optional(v.string()),         // YYYY-MM-DD
    certificateType: v.string(),
    role: v.string(),
    product: v.optional(v.string()),
    reportingTo: v.optional(v.string()),
    workMode: v.optional(v.string()),
    issuedDate: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    issuerName: v.string(),
    issuerTitle: v.string(),
    notes: v.optional(v.string()),
    templateData: v.optional(v.string()),  // JSON string of all original form fields
  },
  handler: async (ctx, args) => {
    // Prevent duplicate certificate IDs
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_certificate_id", (q) =>
        q.eq("certificateId", args.certificateId)
      )
      .unique();
    if (existing) throw new Error(`Certificate ID ${args.certificateId} already exists`);

    return await ctx.db.insert("certificates", {
      ...args,
      status: "active",
      verificationCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const patchCertificate = internalMutation({
  args: {
    id: v.id("certificates"),
    holderName: v.optional(v.string()),
    holderEmail: v.optional(v.string()),
    holderInstitution: v.optional(v.string()),
    holderDepartment: v.optional(v.string()),
    holderDob: v.optional(v.string()),
    role: v.optional(v.string()),
    product: v.optional(v.string()),
    workMode: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const doRevoke = internalMutation({
  args: {
    id: v.id("certificates"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "revoked",
      revokedDate: new Date().toISOString().split("T")[0],
      revokedReason: args.reason,
      updatedAt: Date.now(),
    });
  },
});

export const doRestore = internalMutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "active",
      revokedDate: undefined,
      revokedReason: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const doDelete = internalMutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seedSample = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_certificate_id", (q) =>
        q.eq("certificateId", "WS-CERT-2026-0001")
      )
      .unique();
    if (existing) return { seeded: false, message: "Already exists" };

    const id = await ctx.db.insert("certificates", {
      certificateId: "WS-CERT-2026-0001",
      referenceNumber: "WS/INT/2026/AI-FS/001",
      holderName: "John Doe",
      holderEmail: "johndoe@example.com",
      holderInstitution: "Sample University of Technology",
      holderDepartment: "Computer Science & Engineering",
      certificateType: "internship",
      role: "Software Development Intern",
      product: "WaveBase AI",
      reportingTo: "Chief Developer, WaveSeed Co.",
      workMode: "Remote",
      issuedDate: "2026-07-11",
      startDate: "2026-05-12",
      endDate: "2026-07-11",
      issuerName: "Mahender",
      issuerTitle: "Founder, WaveSeed Co.",
      status: "active",
      verificationCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { seeded: true, id };
  },
});

// ─── Next ID Auto-generation ──────────────────────────────────────────────────
export const getNextIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const certs = await ctx.db.query("certificates").collect();
    let maxSeq = 0;
    
    // Scan for highest suffix sequence across all certificates
    for (const c of certs) {
      const match = c.certificateId.match(/(?:CERT|EMP|COURSE|PART|REF|INT)-\d+-(\d+)/) || c.certificateId.match(/-\d+-(\d+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
      
      const refMatch = c.referenceNumber.match(/\/(\d+)$/);
      if (refMatch) {
        const seq = parseInt(refMatch[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const nextSeq = maxSeq === 0 ? 43 : maxSeq + 1; // default start at 0043 if no records
    const nextSeqStr = String(nextSeq).padStart(4, "0");
    const nextSeqShort = String(nextSeq).padStart(3, "0");

    return {
      nextCertId: `WS-CERT-2026-${nextSeqStr}`,
      nextRefNum: `WS/INT/2026/AI-FS/${nextSeqShort}`
    };
  },
});

// ─── Employee Management ──────────────────────────────────────────────────────
export const getAllEmployees = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("employees").order("desc").collect();
  },
});

export const getEmployeeByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const all = await ctx.db.query("employees").collect();
    return all.find(e => e.email?.toLowerCase() === email.toLowerCase()) ?? null;
  },
});

export const insertEmployee = internalMutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    institution: v.optional(v.string()),
    department: v.optional(v.string()),
    role: v.string(),
    product: v.optional(v.string()),
    workMode: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    reportingTo: v.optional(v.string()),
    employeeType: v.string(),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("employees", {
      ...args,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const patchEmployee = internalMutation({
  args: {
    id: v.id("employees"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    institution: v.optional(v.string()),
    department: v.optional(v.string()),
    role: v.optional(v.string()),
    product: v.optional(v.string()),
    workMode: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    reportingTo: v.optional(v.string()),
    employeeType: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteEmployee = internalMutation({
  args: { id: v.id("employees") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

