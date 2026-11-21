import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveBusiness, getBusinessByCode, PARENT_CODE } from "./businesses";

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
    nameFont: v.optional(v.string()),
    templateData: v.optional(v.string()),  // JSON string of all original form fields
    businessId: v.optional(v.id("businesses")),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const person = args.employeeId ? await ctx.db.get(args.employeeId) : null;
    if (args.employeeId && !person) throw new Error("Unknown employee");
    // A certificate issued to a person belongs to that person's business unless told otherwise.
    const biz = await resolveBusiness(ctx, args.businessId ?? person?.businessId);

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
      businessId: biz?._id,
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
    certificateType: v.optional(v.string()),
    role: v.optional(v.string()),
    product: v.optional(v.string()),
    reportingTo: v.optional(v.string()),
    workMode: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    issuerName: v.optional(v.string()),
    issuerTitle: v.optional(v.string()),
    notes: v.optional(v.string()),
    nameFont: v.optional(v.string()),
    status: v.optional(v.string()),
    templateData: v.optional(v.string()),
    signedUrl: v.optional(v.string()),
    signedAt: v.optional(v.string()),
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

export const doExpire = internalMutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "expired",
      updatedAt: Date.now(),
    });
  },
});

export const doDelete = internalMutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    // Acceptance records belong to the document: they go with it
    const acc = await ctx.db.query("acceptances").withIndex("by_certificate", (q) => q.eq("certificateDocId", args.id)).collect();
    for (const r of acc) await ctx.db.delete(r._id);
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
  args: { businessCode: v.optional(v.string()) },
  handler: async (ctx, { businessCode }) => {
    const code = (businessCode ?? PARENT_CODE).toUpperCase();
    const biz = await getBusinessByCode(ctx, code);
    const parent = await getBusinessByCode(ctx, PARENT_CODE);

    // Only this business's certificates count toward its sequence.
    // Legacy rows without a businessId belong to the parent company.
    const certs = (await ctx.db.query("certificates").collect()).filter((c) => {
      const owner = c.businessId ?? parent?._id;
      return !biz || owner === biz._id;
    });

    let maxSeq = 0;
    for (const c of certs) {
      const match = c.certificateId.match(/(?:CERT|EMP|COURSE|PART|REF|INT)-\d+-(\d+)/) || c.certificateId.match(/-\d+-(\d+)$/);
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
      const refMatch = c.referenceNumber.match(/\/(\d+)$/);
      if (refMatch) maxSeq = Math.max(maxSeq, parseInt(refMatch[1], 10));
    }

    // WaveSeed's legacy numbering starts at 0043; new businesses start at 0001.
    const nextSeq = maxSeq === 0 ? (code === PARENT_CODE ? 43 : 1) : maxSeq + 1;
    const year = new Date().getFullYear();
    const long = String(nextSeq).padStart(4, "0");
    const short = String(nextSeq).padStart(3, "0");

    return {
      businessCode: code,
      nextCertId: `${code}-CERT-${year}-${long}`,
      nextRefNum: code === PARENT_CODE ? `WS/INT/${year}/AI-FS/${short}` : `${code}/INT/${year}/${short}`,
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

/**
 * The person a certificate belongs to: the stored link if present,
 * otherwise (legacy certificates) a match on e-mail address.
 */
export const getEmployeeForCertificate = internalQuery({
  args: { certificateDocId: v.id("certificates") },
  handler: async (ctx, { certificateDocId }) => {
    const cert = await ctx.db.get(certificateDocId);
    if (!cert) return null;
    if (cert.employeeId) return await ctx.db.get(cert.employeeId);
    if (!cert.holderEmail) return null;
    const email = cert.holderEmail.toLowerCase();
    const all = await ctx.db.query("employees").collect();
    return all.find((e) => e.email?.toLowerCase() === email) ?? null;
  },
});

export const getCertificatesByEmployee = internalQuery({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    return await ctx.db.query("certificates").withIndex("by_employee", (q) => q.eq("employeeId", employeeId)).collect();
  },
});

/**
 * One-off: link existing certificates to people. Matches on e-mail, then on exact name.
 * Only links when exactly one person matches; everything else is reported, never guessed.
 * Run with { dryRun: true } first.
 */
export const linkCertificatesToEmployees = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const emps = await ctx.db.query("employees").collect();
    const certs = (await ctx.db.query("certificates").collect()).filter((c) => !c.employeeId);
    const norm = (x?: string) => (x ?? "").trim().toLowerCase().replace(/\s+/g, " ");

    const linked: { certificateId: string; holder: string; by: string; person: string }[] = [];
    const unmatched: { certificateId: string; holder: string; reason: string }[] = [];

    for (const cert of certs) {
      let match: typeof emps = [];
      let by = "";
      if (cert.holderEmail) {
        match = emps.filter((e) => norm(e.email) === norm(cert.holderEmail));
        by = "email";
      }
      if (match.length === 0) {
        match = emps.filter((e) => norm(e.name) === norm(cert.holderName));
        by = "name";
      }
      if (match.length === 1) {
        linked.push({ certificateId: cert.certificateId, holder: cert.holderName, by, person: match[0].empCode ?? match[0].name });
        if (!dryRun) await ctx.db.patch(cert._id, { employeeId: match[0]._id });
      } else {
        unmatched.push({ certificateId: cert.certificateId, holder: cert.holderName, reason: match.length === 0 ? "no matching profile" : "multiple matching profiles" });
      }
    }
    return { dryRun, toLink: linked.length, unmatchedCount: unmatched.length, linked, unmatched };
  },
});

/** Manually link one certificate to a person (by their ID code), for cases the automatic match cannot decide. */
export const linkCertificateToPerson = internalMutation({
  args: { certificateId: v.string(), empCode: v.string() },
  handler: async (ctx, { certificateId, empCode }) => {
    const cert = await ctx.db.query("certificates").withIndex("by_certificate_id", (q) => q.eq("certificateId", certificateId)).unique();
    if (!cert) throw new Error(`Certificate ${certificateId} not found`);
    const person = await ctx.db.query("employees").withIndex("by_emp_code", (q) => q.eq("empCode", empCode)).first();
    if (!person) throw new Error(`Person ${empCode} not found`);
    await ctx.db.patch(cert._id, { employeeId: person._id });
    return { certificateId, linkedTo: person.empCode, name: person.name };
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
    businessId: v.optional(v.id("businesses")),
  },
  handler: async (ctx, args) => {
    const biz = await resolveBusiness(ctx, args.businessId);
    const bizCode = biz?.code ?? PARENT_CODE;
    // Sequential, collision-free ID: WS-INT-2026-0001 (interns) / WS-EMP-2026-0001 (employees).
    // Mutations are serialised by Convex, so read-increment-write on the counter is atomic.
    const kind = args.employeeType === "intern" ? "INT" : "EMP";
    const year = new Date().getFullYear();
    const counterKey = `emp:${bizCode}:${kind}:${year}`;
    const counter = await ctx.db.query("counters").withIndex("by_key", (q) => q.eq("key", counterKey)).first();
    let seq: number;
    if (counter) {
      seq = counter.value + 1;
      await ctx.db.patch(counter._id, { value: seq });
    } else {
      seq = 1;
      await ctx.db.insert("counters", { key: counterKey, value: seq });
    }
    const empCode = `${bizCode}-${kind}-${year}-${String(seq).padStart(4, "0")}`;

    return await ctx.db.insert("employees", {
      ...args,
      businessId: biz?._id,
      empCode,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// One-off: give an ID to profiles created before IDs existed.
// Oldest first, year taken from each profile's creation date, continuing any existing counter.
// Run with { dryRun: true } first to preview.
export const assignMissingCodes = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const missing = (await ctx.db.query("employees").collect())
      .filter((e) => !e.empCode)
      .sort((a, b) => a.createdAt - b.createdAt);

    const parent = await getBusinessByCode(ctx, PARENT_CODE);
    const values = new Map<string, number>();
    const result: { name: string; type: string; code: string }[] = [];

    for (const e of missing) {
      const kind = e.employeeType === "intern" ? "INT" : "EMP";
      const year = new Date(e.createdAt).getFullYear();
      const owner = e.businessId ? await ctx.db.get(e.businessId) : parent;
      const bizCode = owner?.code ?? PARENT_CODE;
      const key = `emp:${bizCode}:${kind}:${year}`;
      if (!values.has(key)) {
        const row = await ctx.db.query("counters").withIndex("by_key", (q) => q.eq("key", key)).first();
        values.set(key, row?.value ?? 0);
      }
      const seq = values.get(key)! + 1;
      values.set(key, seq);
      const code = `${bizCode}-${kind}-${year}-${String(seq).padStart(4, "0")}`;
      result.push({ name: e.name, type: e.employeeType, code });
      if (!dryRun) await ctx.db.patch(e._id, { empCode: code });
    }

    if (!dryRun) {
      for (const [key, value] of values) {
        const row = await ctx.db.query("counters").withIndex("by_key", (q) => q.eq("key", key)).first();
        if (row) await ctx.db.patch(row._id, { value });
        else await ctx.db.insert("counters", { key, value });
      }
    }
    return { dryRun, count: result.length, result };
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

/**
 * Delete a person AND everything personal that hangs off them: uploaded KYC files (storage +
 * records) and the access log. Certificates that were already issued stay valid and verifiable;
 * they are simply unlinked from the deleted profile.
 */
export const deleteEmployee = internalMutation({
  args: { id: v.id("employees") },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("documents").withIndex("by_employee", (q) => q.eq("employeeId", args.id)).collect();
    for (const d of docs) {
      try { await ctx.storage.delete(d.storageId as any); } catch { /* already gone */ }
      await ctx.db.delete(d._id);
    }
    const logs = await ctx.db.query("docAccessLogs").withIndex("by_employee", (q) => q.eq("employeeId", args.id)).collect();
    for (const l of logs) await ctx.db.delete(l._id);
    const certs = await ctx.db.query("certificates").withIndex("by_employee", (q) => q.eq("employeeId", args.id)).collect();
    for (const c of certs) await ctx.db.patch(c._id, { employeeId: undefined });
    await ctx.db.delete(args.id);
  },
});

export const updateSignedDocument = internalMutation({
  args: {
    id: v.id("certificates"),
    signedUrl: v.string(),
    signedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      signedUrl: args.signedUrl,
      signedAt: args.signedAt,
      updatedAt: Date.now(),
    });
  },
});


