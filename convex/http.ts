import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const http = httpRouter();

// ─── CORS Helper ─────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────
const ROLES: Record<string, string> = {
  admin:      "ADMIN_PASSWORD",
  hr:         "HR_PASSWORD",
  finance:    "FINANCE_PASSWORD",
  operations: "OPERATIONS_PASSWORD",
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison (both inputs hashed first so lengths match) */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/** Password → role. Only used at login; requests authenticate with session tokens. */
async function resolveRole(password: string): Promise<string | null> {
  if (!password) return null;
  let match: string | null = null;
  for (const [role, envKey] of Object.entries(ROLES)) {
    const pw = process.env[envKey];
    // Check every role (no early exit) to keep timing uniform
    if (pw && pw.length > 0 && (await safeEqual(password, pw)) && !match) match = role;
  }
  return match;
}

function bearerToken(request: Request): string {
  const auth = request.headers.get("Authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/** Returns the caller's role or null if unauthenticated */
async function getRole(ctx: ActionCtx, request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token || token.length < 32) return null;
  return await ctx.runQuery(internal.security.getSessionRole, { tokenHash: await sha256Hex(token) });
}

/** Gate: only passes if caller has one of the allowed roles */
async function checkRole(ctx: ActionCtx, request: Request, ...allowed: string[]): Promise<boolean> {
  const role = await getRole(ctx, request);
  return role !== null && allowed.includes(role);
}

/** Shorthand: any authenticated role */
async function checkAuth(ctx: ActionCtx, request: Request): Promise<boolean> {
  return (await getRole(ctx, request)) !== null;
}

function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "unknown").slice(0, 100);
}

function tooMany(ms: number) {
  const mins = Math.ceil(ms / 60_000);
  return json({ error: `Too many attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.` }, 429);
}

// ─── Holder DOB check (secure download / signed upload) ──────────────────────
// Limited per certificate (not per IP) so rotating IPs doesn't help brute force.
const DOB_MAX_FAILS = 5;
const DOB_WINDOW_MS = 15 * 60_000;
const DOB_LOCK_MS = 15 * 60_000;

type CertDoc = Doc<"certificates">;

async function resolveHolderDob(ctx: ActionCtx, cert: CertDoc): Promise<string | null> {
  if (cert.holderDob) return cert.holderDob;
  if (!cert.holderEmail) return null;
  const emp = await ctx.runQuery(internal.certificates.getEmployeeByEmail, { email: cert.holderEmail });
  try { return emp?.meta ? (JSON.parse(emp.meta).dob || null) : null; } catch { return null; }
}

/** Returns null when the DOB matches, otherwise the error Response to send. */
async function verifyHolderDob(ctx: ActionCtx, cert: CertDoc, dob: string): Promise<Response | null> {
  const key = `dob:${cert._id}`;
  const locked = await ctx.runQuery(internal.security.lockedFor, { key });
  if (locked > 0) return tooMany(locked);

  const resolved = await resolveHolderDob(ctx, cert);
  if (!resolved) {
    return json({ error: "Secure access is not enabled for this document. Please contact WaveSeed." }, 403);
  }
  const normalise = (d: string) => d.replace(/\s/g, "").toLowerCase();
  if (!(await safeEqual(normalise(resolved), normalise(dob)))) {
    const r = await ctx.runMutation(internal.security.hit, {
      key, max: DOB_MAX_FAILS, windowMs: DOB_WINDOW_MS, lockMs: DOB_LOCK_MS,
    });
    if (r.lockedFor > 0) return tooMany(r.lockedFor);
    return json({
      error: `Incorrect date of birth. ${r.remaining} attempt${r.remaining === 1 ? "" : "s"} remaining.`,
      remaining: r.remaining,
    }, 401);
  }
  await ctx.runMutation(internal.security.clear, { key });
  return null;
}

// ─── Public onboarding validation ────────────────────────────────────────────
// This endpoint is unauthenticated and its data is rendered in the admin
// portal, so accept only known fields with bounded, well-formed values.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/;
// Strip control chars and angle brackets (no legitimate use in these fields)
const cleanText = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function sanitizeOnboarding(b: Record<string, unknown>) {
  const name = cleanText(b.name, 120);
  const email = cleanText(b.email, 254).toLowerCase();
  const role = cleanText(b.role, 120);
  const employeeType = b.employeeType === "employee" ? "employee" : b.employeeType === "intern" ? "intern" : null;
  const workMode = ["", "Remote", "On-site", "Hybrid"].includes(String(b.workMode ?? "")) ? String(b.workMode ?? "") : null;
  const startDate = String(b.startDate ?? "");
  const endDate = b.endDate ? String(b.endDate) : "";

  if (!name || !role) return "Name and role are required.";
  if (!email || !EMAIL_RE.test(email)) return "Please provide a valid email address.";
  if (!employeeType) return "Invalid employee type.";
  if (workMode === null) return "Invalid work mode.";
  if (startDate && !DATE_RE.test(startDate)) return "Invalid start date.";
  if (endDate && !DATE_RE.test(endDate)) return "Invalid end date.";

  // meta: flat JSON object of short strings / booleans
  let meta: string | undefined;
  if (b.meta !== undefined) {
    let obj: unknown;
    try { obj = typeof b.meta === "string" ? JSON.parse(b.meta) : b.meta; } catch { return "Invalid profile details."; }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "Invalid profile details.";
    const out: Record<string, string | boolean> = {};
    for (const [k, val] of Object.entries(obj as Record<string, unknown>).slice(0, 40)) {
      const key = k.replace(/[^A-Za-z0-9_]/g, "").slice(0, 40);
      if (!key) continue;
      out[key] = typeof val === "boolean" ? val : cleanText(val, 2000);
    }
    if (out.dob && !DATE_RE.test(String(out.dob))) return "Invalid date of birth.";
    meta = JSON.stringify(out);
  }

  return {
    name, email, role, employeeType,
    workMode: workMode || undefined,
    institution: cleanText(b.institution, 200) || undefined,
    department: cleanText(b.department, 200) || undefined,
    product: cleanText(b.product, 120) || undefined,
    reportingTo: cleanText(b.reportingTo, 120) || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    meta,
  };
}

// ─── Upload validation ───────────────────────────────────────────────────────
// Trust the file's magic bytes, not the client's Content-Type, so nothing
// executable (HTML/SVG/JS) can be hosted from our storage.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function validatedUpload(request: Request): Promise<Blob | Response> {
  const blob = await request.blob();
  if (blob.size === 0) return json({ error: "File is empty" }, 400);
  if (blob.size > MAX_UPLOAD_BYTES) return json({ error: "File exceeds 5MB size limit" }, 400);
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const starts = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  let type: string | null = null;
  if (starts(0x25, 0x50, 0x44, 0x46)) type = "application/pdf";                 // %PDF
  else if (starts(0x89, 0x50, 0x4e, 0x47)) type = "image/png";
  else if (starts(0xff, 0xd8, 0xff)) type = "image/jpeg";
  else if (starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) type = "image/webp";
  if (!type) return json({ error: "Only PDF, PNG, JPEG or WEBP files are allowed" }, 415);
  return new Blob([await blob.arrayBuffer()], { type });
}

/** 403 Forbidden helper */
function forbidden(msg = "Forbidden — insufficient permissions for your role") {
  return json({ error: msg }, 403);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — Certificate Verification
// ═══════════════════════════════════════════════════════════════════════════════

http.route({
  path: "/verify",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/verify",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim().toUpperCase();
    const ref = url.searchParams.get("ref")?.trim();

    if (!id && !ref) {
      return json({ error: "Provide ?id= or ?ref= parameter" }, 400);
    }

    let cert = null;
    if (id) {
      cert = await ctx.runQuery(internal.certificates.getByCertificateId, {
        certificateId: id,
      });
    } else if (ref) {
      cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, {
        referenceNumber: ref,
      });
    }

    if (!cert) {
      return json({ found: false }, 404);
    }

    // Track verification
    await ctx.runMutation(internal.certificates.incrementVerificationCount, {
      id: cert._id,
    });

    // Return safe public payload (no internal _id exposed in raw form)
    return json({
      found: true,
      certificateId: cert.certificateId,
      referenceNumber: cert.referenceNumber,
      holderName: cert.holderName,
      holderInstitution: cert.holderInstitution ?? null,
      holderDepartment: cert.holderDepartment ?? null,
      certificateType: cert.certificateType,
      role: cert.role,
      product: cert.product ?? null,
      reportingTo: cert.reportingTo ?? null,
      workMode: cert.workMode ?? null,
      issuedDate: cert.issuedDate,
      startDate: cert.startDate ?? null,
      endDate: cert.endDate ?? null,
      issuerName: cert.issuerName,
      issuerTitle: cert.issuerTitle,
      status: cert.status,
      revokedDate: cert.revokedDate ?? null,
      revokedReason: cert.revokedReason ?? null,
      verificationCount: cert.verificationCount + 1,
    });
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — Secure Document Download (ref + dob auth)
// ═══════════════════════════════════════════════════════════════════════════════


http.route({
  path: "/public/download",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/public/download",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid request body" }, 400);

    const { ref, certId, dob } = body as { ref?: string; certId?: string; dob?: string };

    if (!dob || (!ref && !certId)) {
      return json({ error: "Provide (ref or certId) and dob" }, 400);
    }

    // Look up certificate
    let cert = null;
    if (ref) {
      cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, { referenceNumber: String(ref).trim() });
    } else if (certId) {
      cert = await ctx.runQuery(internal.certificates.getByCertificateId, { certificateId: String(certId).trim().toUpperCase() });
    }
    if (!cert) {
      return json({ error: "Certificate not found. Please check your reference number." }, 404);
    }

    const denied = await verifyHolderDob(ctx, cert, String(dob));
    if (denied) return denied;

    if (cert.status === "revoked") {
      return json({ error: "This certificate has been revoked and is no longer valid.", revoked: true }, 403);
    }

    // Return safe payload: templateData for client-side rendering + top-level fields
    return json({
      success: true,
      certificateType: cert.certificateType,
      templateData:    cert.templateData ?? null,
      // Core fields as fallback if templateData is missing
      certificateId:    cert.certificateId,
      referenceNumber:  cert.referenceNumber,
      holderName:       cert.holderName,
      holderEmail:      cert.holderEmail      ?? null,
      holderInstitution:cert.holderInstitution ?? null,
      holderDepartment: cert.holderDepartment  ?? null,
      role:             cert.role,
      product:          cert.product           ?? null,
      workMode:         cert.workMode          ?? null,
      reportingTo:      cert.reportingTo       ?? null,
      issuedDate:       cert.issuedDate,
      startDate:        cert.startDate         ?? null,
      endDate:          cert.endDate           ?? null,
      issuerName:       cert.issuerName,
      issuerTitle:      cert.issuerTitle,
      signedUrl:        cert.signedUrl         ?? null,
      signedAt:         cert.signedAt          ?? null,
    });
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Auth Check
// ═══════════════════════════════════════════════════════════════════════════════

http.route({
  path: "/admin/auth",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/auth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Per-IP lockout, plus a global cap so rotating IPs can't brute force either
    const ipKey = `login:ip:${clientIp(request)}`;
    const globalKey = "login:global";
    const locked = Math.max(
      await ctx.runQuery(internal.security.lockedFor, { key: ipKey }),
      await ctx.runQuery(internal.security.lockedFor, { key: globalKey }),
    );
    if (locked > 0) return tooMany(locked);

    const body = await request.json().catch(() => ({}));
    const password = String((body as { password?: unknown }).password ?? "").slice(0, 256);
    const role = await resolveRole(password);
    if (!role) {
      await ctx.runMutation(internal.security.hit, { key: ipKey, max: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 });
      await ctx.runMutation(internal.security.hit, { key: globalKey, max: 50, windowMs: 60 * 60_000, lockMs: 15 * 60_000 });
      return json({ valid: false }, 401);
    }
    await ctx.runMutation(internal.security.clear, { key: ipKey });

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = Date.now() + SESSION_TTL_MS;
    await ctx.runMutation(internal.security.createSession, { tokenHash: await sha256Hex(token), role, expiresAt });
    return json({ valid: true, role, token, expiresAt });
  }),
});

http.route({
  path: "/admin/logout",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/logout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = bearerToken(request);
    if (token) await ctx.runMutation(internal.security.deleteSession, { tokenHash: await sha256Hex(token) });
    return json({ success: true });
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Certificates CRUD
// ═══════════════════════════════════════════════════════════════════════════════

http.route({
  path: "/admin/certificates",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// GET all certificates — admin, hr, finance
http.route({
  path: "/admin/certificates",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr", "finance"))) return forbidden();
    const certs = await ctx.runQuery(internal.certificates.getAllCertificates, {});
    return json(certs);
  }),
});

// POST create certificate — admin, hr only
http.route({
  path: "/admin/certificates",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      const id = await ctx.runMutation(internal.certificates.insertCertificate, body as Parameters<typeof internal.certificates.insertCertificate>[0]);
      return json({ success: true, id }, 201);
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Stats ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/stats",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    const stats = await ctx.runQuery(internal.certificates.getStats, {});
    return json(stats);
  }),
});

// ─── Admin Update ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/update",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST update certificate — admin, hr only
http.route({
  path: "/admin/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      // Status changes go through revoke/restore/expire; signed copies through upload.
      const { status: _s, signedUrl: _u, signedAt: _a, ...fields } = body as Record<string, unknown>;
      if (fields.certificateType !== undefined && !/^[a-z0-9-]{1,40}$/.test(String(fields.certificateType))) {
        return json({ error: "Invalid document type" }, 400);
      }
      await ctx.runMutation(internal.certificates.patchCertificate, fields as Parameters<typeof internal.certificates.patchCertificate>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Revoke ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/revoke",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST revoke — admin, hr only
http.route({
  path: "/admin/revoke",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.doRevoke, body as Parameters<typeof internal.certificates.doRevoke>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Restore ────────────────────────────────────────────────────────────

http.route({
  path: "/admin/restore",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST restore — admin, hr only
http.route({
  path: "/admin/restore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.doRestore, body as Parameters<typeof internal.certificates.doRestore>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Expire ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/expire",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST expire — admin, hr only
http.route({
  path: "/admin/expire",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.doExpire, body as Parameters<typeof internal.certificates.doExpire>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Delete ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/delete",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST delete — ADMIN ONLY
http.route({
  path: "/admin/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin"))) return forbidden("Only the Admin can permanently delete certificates.");
    const body = await request.json().catch(() => null);
    if (!body?.id) return json({ error: "Missing id" }, 400);

    try {
      await ctx.runMutation(internal.certificates.doDelete, { id: body.id });
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Admin Seed ───────────────────────────────────────────────────────────────

http.route({
  path: "/admin/seed",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin"))) return forbidden();
    const result = await ctx.runMutation(internal.certificates.seedSample, {});
    return json(result);
  }),
});

// ─── Admin next-ids ───────────────────────────────────────────────────────────
http.route({
  path: "/admin/next-ids",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/next-ids",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    const result = await ctx.runQuery(internal.certificates.getNextIds, {});
    return json(result);
  }),
});

// ─── Admin Employees CRUD ─────────────────────────────────────────────────────
http.route({
  path: "/admin/employees",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// GET employees — admin, hr, operations
http.route({
  path: "/admin/employees",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr", "operations"))) return forbidden();
    const list = await ctx.runQuery(internal.certificates.getAllEmployees, {});
    return json(list);
  }),
});

// POST add employee — admin, hr, operations
http.route({
  path: "/admin/employees",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr", "operations"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      const id = await ctx.runMutation(internal.certificates.insertEmployee, body as Parameters<typeof internal.certificates.insertEmployee>[0]);
      return json({ success: true, id }, 201);
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

http.route({
  path: "/admin/employees/delete",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST delete employee — admin, hr only
http.route({
  path: "/admin/employees/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.deleteEmployee, body as Parameters<typeof internal.certificates.deleteEmployee>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

http.route({
  path: "/admin/employees/update",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

// POST update employee — admin, hr only
http.route({
  path: "/admin/employees/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.patchEmployee, body as Parameters<typeof internal.certificates.patchEmployee>[0]);
      return json({ success: true });
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

http.route({
  path: "/public/onboard",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/public/onboard",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Spam guard: per IP and overall
    const ipKey = `onboard:ip:${clientIp(request)}`;
    const locked = Math.max(
      await ctx.runQuery(internal.security.lockedFor, { key: ipKey }),
      await ctx.runQuery(internal.security.lockedFor, { key: "onboard:global" }),
    );
    if (locked > 0) return tooMany(locked);
    await ctx.runMutation(internal.security.hit, { key: ipKey, max: 5, windowMs: 60 * 60_000, lockMs: 60 * 60_000 });
    await ctx.runMutation(internal.security.hit, { key: "onboard:global", max: 200, windowMs: 24 * 60 * 60_000, lockMs: 60 * 60_000 });

    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") return json({ error: "Invalid JSON" }, 400);
    const parsed = sanitizeOnboarding(raw as Record<string, unknown>);
    if (typeof parsed === "string") return json({ error: parsed }, 400);
    const body = parsed;

    // Duplicate email check
    const email = body.email;
    if (email) {
      const existing = await ctx.runQuery(internal.certificates.getEmployeeByEmail, { email });
      if (existing) {
        return json({
          error: "A profile with this email already exists in the WaveSeed registry. Please contact HR at careers@waveseed.app if you believe this is a mistake."
        }, 409);
      }
    }

    try {
      const id = await ctx.runMutation(internal.certificates.insertEmployee, body);
      return json({ success: true, id }, 201);
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

// ─── Signed Acceptance Document Uploads ──────────────────────────────────────

http.route({
  path: "/public/upload-signed",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/public/upload-signed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const ref = url.searchParams.get("ref")?.trim();
    const certId = url.searchParams.get("id")?.trim();
    const dob = url.searchParams.get("dob")?.trim();

    if (!dob || (!ref && !certId)) {
      return json({ error: "Provide (ref or id) and dob parameters" }, 400);
    }

    // 1. Authenticate using DOB + Reference / Certificate ID
    let cert = null;
    if (ref) {
      cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, { referenceNumber: ref });
    } else if (certId) {
      cert = await ctx.runQuery(internal.certificates.getByCertificateId, { certificateId: certId.toUpperCase() });
    }
    if (!cert) {
      return json({ error: "Certificate not found" }, 404);
    }
    if (cert.status === "revoked") {
      return json({ error: "This document has been revoked." }, 403);
    }
    const denied = await verifyHolderDob(ctx, cert, dob);
    if (denied) return denied;

    // 2. Validate uploaded file (type by magic bytes, size)
    const blob = await validatedUpload(request);
    if (blob instanceof Response) return blob;

    // Store in Convex storage
    const storageId = await ctx.storage.store(blob);
    const signedUrl = await ctx.storage.getUrl(storageId);

    if (!signedUrl) {
      return json({ error: "Failed to generate storage URL" }, 500);
    }

    // 3. Update database record
    await ctx.runMutation(internal.certificates.updateSignedDocument, {
      id: cert._id,
      signedUrl,
      signedAt: new Date().toISOString(),
    });

    return json({ success: true, signedUrl });
  }),
});

http.route({
  path: "/admin/upload-signed",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/upload-signed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Authenticate admin/hr role
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id")?.trim();
    if (!idParam) {
      return json({ error: "Provide certificate database id parameter" }, 400);
    }

    // 2. Validate file (type by magic bytes, size)
    const blob = await validatedUpload(request);
    if (blob instanceof Response) return blob;

    // Store in Convex storage
    const storageId = await ctx.storage.store(blob);
    const signedUrl = await ctx.storage.getUrl(storageId);

    if (!signedUrl) {
      return json({ error: "Failed to generate storage URL" }, 500);
    }

    // 3. Update database record
    await ctx.runMutation(internal.certificates.updateSignedDocument, {
      id: idParam as Id<"certificates">, // validated by v.id() in the mutation
      signedUrl,
      signedAt: new Date().toISOString(),
    });

    return json({ success: true, signedUrl });
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT UPLOADS (KYC / Onboarding Documents)
// ═══════════════════════════════════════════════════════════════════════════

// Keep in sync with src/utils/docCatalog.js
const ALLOWED_DOC_TYPES = new Set([
  "govt_id", "pan", "photo", "bank", "college_id",
  "tenth", "twelfth", "iti_diploma", "graduation", "postgrad", "dual_degree",
  "other_cert", "marksheet", "degree",
  "experience", "relieving", "payslip",
]);

// Max 1.5 MB per file (after client-side compression)
const DOC_MAX_BYTES = 1.5 * 1024 * 1024;

// Allowed MIME types for documents
const ALLOWED_DOC_MIMES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
]);

// Magic bytes for type detection
function detectMime(bytes: Uint8Array): string | null {
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

// ── Public: request an upload URL (authenticated by reference + DOB) ─────────
http.route({
  path: "/public/docs/upload-url",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/public/docs/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ip = clientIp(request);
    const rlKey = `doc-upload:${ip}`;
    const locked = await ctx.runQuery(internal.security.lockedFor, { key: rlKey });
    if (locked > 0) return tooMany(locked);

    let body: { ref?: string; dob?: string; docType?: string; fileName?: string; mimeType?: string; sizeBytes?: number };
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const { ref, dob, docType, fileName, mimeType, sizeBytes } = body ?? {};

    if (!ref || !dob || !docType || !fileName || !mimeType || !sizeBytes) {
      return json({ error: "Missing required fields: ref, dob, docType, fileName, mimeType, sizeBytes" }, 400);
    }
    if (!ALLOWED_DOC_TYPES.has(docType)) {
      return json({ error: "Invalid document type" }, 400);
    }
    if (!ALLOWED_DOC_MIMES.has(mimeType)) {
      return json({ error: "File type not allowed. Use JPG, PNG, WebP, or PDF." }, 400);
    }
    if (sizeBytes > DOC_MAX_BYTES) {
      return json({ error: `File too large. Max 1.5 MB after compression (got ${Math.round(sizeBytes / 1024)} KB).` }, 413);
    }

    // Look up employee by reference number on a certificate
    const cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, { referenceNumber: ref.trim() });
    if (!cert) return json({ error: "Reference number not found" }, 404);

    // DOB check
    const denied = await verifyHolderDob(ctx, cert, dob.trim());
    if (denied) return denied;

    // Find employee record by email
    if (!cert.holderEmail) return json({ error: "No employee record linked to this certificate." }, 404);
    const emp = await ctx.runQuery(internal.certificates.getEmployeeByEmail, { email: cert.holderEmail });
    if (!emp) return json({ error: "Employee profile not found." }, 404);

    // Generate a Convex upload URL (short-lived, single-use)
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return json({ uploadUrl, employeeId: emp._id });
  }),
});

// ── Public: confirm upload (save storageId to documents table) ────────────────
http.route({
  path: "/public/docs/confirm",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/public/docs/confirm",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ip = clientIp(request);

    let body: { ref?: string; dob?: string; employeeId?: string; docType?: string; storageId?: string; fileName?: string; mimeType?: string; sizeBytes?: number };
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const { ref, dob, employeeId, docType, storageId, fileName, mimeType, sizeBytes } = body ?? {};

    if (!ref || !dob || !employeeId || !docType || !storageId || !fileName || !mimeType || !sizeBytes) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!ALLOWED_DOC_TYPES.has(docType)) return json({ error: "Invalid document type" }, 400);
    if (!ALLOWED_DOC_MIMES.has(mimeType)) return json({ error: "File type not allowed" }, 400);
    if (sizeBytes > DOC_MAX_BYTES) return json({ error: "File too large" }, 413);

    // Re-verify DOB before committing
    const cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, { referenceNumber: ref.trim() });
    if (!cert) return json({ error: "Reference not found" }, 404);
    const denied = await verifyHolderDob(ctx, cert, dob.trim());
    if (denied) return denied;

    // Validate magic bytes from storage
    const stored = await ctx.storage.get(storageId as any);
    if (!stored) return json({ error: "Upload not found in storage" }, 404);
    const peek = new Uint8Array(await stored.slice(0, 12).arrayBuffer());
    const detectedMime = detectMime(peek);
    if (!detectedMime || !ALLOWED_DOC_MIMES.has(detectedMime)) {
      await ctx.storage.delete(storageId as any);
      return json({ error: "File content does not match allowed types (JPG/PNG/WebP/PDF)" }, 415);
    }

    // Sanitise filename
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-\s]/g, "").trim().slice(0, 120) || "document";

    await ctx.runMutation(internal.documents.upsertDocument, {
      employeeId: employeeId as any,
      docType,
      storageId,
      fileName: safeName,
      mimeType: detectedMime,
      sizeBytes,
      uploadedByIp: ip,
    });

    return json({ success: true });
  }),
});

// ── Admin: list documents for an employee ────────────────────────────────────
http.route({
  path: "/admin/docs",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/docs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);

    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId")?.trim();
    if (!employeeId) return json({ error: "Provide employeeId parameter" }, 400);

    const docs = await ctx.runQuery(internal.documents.getByEmployee, { employeeId: employeeId as any });

    // Attach a short-lived signed URL to each document
    const withUrls = await Promise.all(docs.map(async (d) => {
      const url = await ctx.storage.getUrl(d.storageId as any);
      return {
        id: d._id,
        docType: d.docType,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        uploadedAt: d.uploadedAt,
        url,
      };
    }));

    return json({ documents: withUrls });
  }),
});

// ── Admin: mark a document verified / unverified ─────────────────────────────
http.route({
  path: "/admin/docs/verify",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/docs/verify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();

    let body: { id?: string; verified?: boolean };
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body.id || typeof body.verified !== "boolean") return json({ error: "Provide id and verified" }, 400);

    await ctx.runMutation(internal.documents.setVerified, { id: body.id as any, verified: body.verified });
    return json({ success: true });
  }),
});

// ── Admin: delete a document ──────────────────────────────────────────────────
http.route({
  path: "/admin/docs/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await checkAuth(ctx, request))) return json({ error: "Unauthorized" }, 401);
    if (!(await checkRole(ctx, request, "admin", "hr"))) return forbidden();

    let body: { id?: string };
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body.id) return json({ error: "Provide document id" }, 400);

    await ctx.runMutation(internal.documents.deleteDocument, { id: body.id as any });
    return json({ success: true });
  }),
});

export default http;
