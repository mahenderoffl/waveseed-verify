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

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  return resolveRole(token) !== null;
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

// GET all certificates
http.route({
  path: "/admin/certificates",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    const certs = await ctx.runQuery(internal.certificates.getAllCertificates, {});
    return json(certs);
  }),
});

// POST create certificate
http.route({
  path: "/admin/certificates",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/revoke",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/restore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

// ─── Admin Delete ─────────────────────────────────────────────────────────────

http.route({
  path: "/admin/delete",
  method: "OPTIONS",
  handler: httpAction(async () => preflight()),
});

http.route({
  path: "/admin/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/employees",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
    const list = await ctx.runQuery(internal.certificates.getAllEmployees, {});
    return json(list);
  }),
});

http.route({
  path: "/admin/employees",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/employees/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

http.route({
  path: "/admin/employees/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return json({ error: "Unauthorized" }, 401);
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

    try {
      const id = await ctx.runMutation(internal.certificates.insertEmployee, body as Parameters<typeof internal.certificates.insertEmployee>[0]);
      return json({ success: true, id }, 201);
    } catch (e: unknown) {
      return json({ error: (e as Error).message }, 400);
    }
  }),
});

export default http;
