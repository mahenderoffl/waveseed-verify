import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

function resolveRole(token: string): string | null {
  for (const [role, envKey] of Object.entries(ROLES)) {
    const pw = process.env[envKey];
    if (pw && pw.length > 0 && token === pw) return role;
  }
  return null;
}

/** Returns the caller's role or null if unauthenticated */
function getRole(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  return resolveRole(token);
}

/** Gate: only passes if caller has one of the allowed roles */
function checkRole(request: Request, ...allowed: string[]): boolean {
  const role = getRole(request);
  return role !== null && allowed.includes(role);
}

/** Shorthand: any authenticated role */
function checkAuth(request: Request): boolean {
  return getRole(request) !== null;
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

// In-memory brute-force guard: key = IP+ref, value = { fails, lockedUntil }
const _downloadAttempts = new Map<string, { fails: number; lockedUntil: number }>();
const MAX_FAILS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds

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

    // Rate limiting — basic IP-based guard
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitKey = `${ip}:${(ref || certId || "").toLowerCase()}`;
    const attempt = _downloadAttempts.get(rateLimitKey) ?? { fails: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > Date.now()) {
      const secsLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      return json({ error: `Too many failed attempts. Please wait ${secsLeft} seconds and try again.` }, 429);
    }

    // Look up certificate
    let cert = null;
    if (ref) {
      cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, { referenceNumber: ref.trim() });
    } else if (certId) {
      cert = await ctx.runQuery(internal.certificates.getByCertificateId, { certificateId: certId.trim().toUpperCase() });
    }

    if (!cert) {
      // Increment fail counter
      attempt.fails += 1;
      if (attempt.fails >= MAX_FAILS) attempt.lockedUntil = Date.now() + LOCKOUT_MS;
      _downloadAttempts.set(rateLimitKey, attempt);
      return json({ error: "Certificate not found. Please check your reference number." }, 404);
    }

    // Resolve DOB: either directly on certificate, or from employee directory matching email
    let resolvedDob = cert.holderDob || null;
    if (!resolvedDob && cert.holderEmail) {
      const emp = await ctx.runQuery(internal.certificates.getEmployeeByEmail, { email: cert.holderEmail });
      if (emp && emp.meta) {
        try {
          const meta = JSON.parse(emp.meta);
          if (meta.dob) {
            resolvedDob = meta.dob;
          }
        } catch {}
      }
    }

    if (!resolvedDob) {
      return json({ error: "Secure download is not enabled for this certificate. Please contact WaveSeed." }, 403);
    }

    const normalise = (d: string) => d.replace(/\s/g, "").toLowerCase();
    if (normalise(resolvedDob) !== normalise(dob)) {
      attempt.fails += 1;
      if (attempt.fails >= MAX_FAILS) attempt.lockedUntil = Date.now() + LOCKOUT_MS;
      _downloadAttempts.set(rateLimitKey, attempt);
      const remaining = MAX_FAILS - attempt.fails;
      return json({
        error: remaining > 0
          ? `Incorrect date of birth. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please wait 30 seconds.",
        remaining,
      }, 401);
    }

    // ✅ Auth passed — reset fail counter
    _downloadAttempts.delete(rateLimitKey);

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
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json().catch(() => ({}));
    const password = (body as { password?: string }).password ?? "";
    const role = resolveRole(password);
    if (!role) return json({ valid: false }, 401);
    return json({ valid: true, role });
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr", "finance")) return forbidden();
    const certs = await ctx.runQuery(internal.certificates.getAllCertificates, {});
    return json(certs);
  }),
});

// POST create certificate — admin, hr only
http.route({
  path: "/admin/certificates",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    try {
      await ctx.runMutation(internal.certificates.patchCertificate, body as Parameters<typeof internal.certificates.patchCertificate>[0]);
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin")) return forbidden("Only the Admin can permanently delete certificates.");
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr", "operations")) return forbidden();
    const list = await ctx.runQuery(internal.certificates.getAllEmployees, {});
    return json(list);
  }),
});

// POST add employee — admin, hr, operations
http.route({
  path: "/admin/employees",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr", "operations")) return forbidden();
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
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    if (!checkRole(request, "admin", "hr")) return forbidden();
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
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    // Duplicate email check
    const email = (body as { email?: string }).email?.trim().toLowerCase();
    if (email) {
      const existing = await ctx.runQuery(internal.certificates.getEmployeeByEmail, { email });
      if (existing) {
        return json({
          error: "A profile with this email already exists in the WaveSeed registry. Please contact HR at careers@waveseed.app if you believe this is a mistake."
        }, 409);
      }
    }

    try {
      const id = await ctx.runMutation(internal.certificates.insertEmployee, body as Parameters<typeof internal.certificates.insertEmployee>[0]);
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
      cert = await ctx.runQuery(internal.certificates.getByReferenceNumber, {
        referenceNumber: ref,
      });
    } else if (certId) {
      cert = await ctx.runQuery(internal.certificates.getByCertificateId, {
        certificateId: certId.toUpperCase(),
      });
    }

    if (!cert) {
      return json({ error: "Certificate not found" }, 404);
    }

    let resolvedDob = cert.holderDob || null;
    if (!resolvedDob && cert.holderEmail) {
      const emp = await ctx.runQuery(internal.certificates.getEmployeeByEmail, {
        email: cert.holderEmail,
      });
      if (emp && emp.meta) {
        try {
          const meta = JSON.parse(emp.meta);
          if (meta.dob) resolvedDob = meta.dob;
        } catch {}
      }
    }

    if (!resolvedDob) {
      return json({ error: "Secure upload is not enabled for this certificate" }, 403);
    }

    const normalise = (d: string) => d.replace(/\s/g, "").toLowerCase();
    if (normalise(resolvedDob) !== normalise(dob)) {
      return json({ error: "Authentication failed. Incorrect date of birth." }, 401);
    }

    // 2. Process uploaded file blob
    const blob = await request.blob();
    if (blob.size === 0) {
      return json({ error: "File blob is empty" }, 400);
    }
    if (blob.size > 5 * 1024 * 1024) {
      return json({ error: "File exceeds 5MB size limit" }, 400);
    }

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
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    if (!checkRole(request, "admin", "hr")) return forbidden();

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id")?.trim();
    if (!idParam) {
      return json({ error: "Provide certificate database id parameter" }, 400);
    }

    const certDbId = ctx.db.normalizeId("certificates", idParam);
    if (!certDbId) {
      return json({ error: "Invalid certificate database ID" }, 400);
    }

    // 2. Process file blob
    const blob = await request.blob();
    if (blob.size === 0) {
      return json({ error: "File blob is empty" }, 400);
    }
    if (blob.size > 5 * 1024 * 1024) {
      return json({ error: "File exceeds 5MB size limit" }, 400);
    }

    // Store in Convex storage
    const storageId = await ctx.storage.store(blob);
    const signedUrl = await ctx.storage.getUrl(storageId);

    if (!signedUrl) {
      return json({ error: "Failed to generate storage URL" }, 500);
    }

    // 3. Update database record
    await ctx.runMutation(internal.certificates.updateSignedDocument, {
      id: certDbId,
      signedUrl,
      signedAt: new Date().toISOString(),
    });

    return json({ success: true, signedUrl });
  }),
});

export default http;
