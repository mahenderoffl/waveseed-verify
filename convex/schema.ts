import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  certificates: defineTable({
    // ── Core Identifiers ─────────────────────────────────────
    certificateId: v.string(),        // e.g. WS-CERT-2026-0042
    referenceNumber: v.string(),      // e.g. WS/INT/2026/AI-FS/042

    // ── Holder Information ────────────────────────────────────
    holderName: v.string(),
    holderEmail: v.optional(v.string()),
    holderInstitution: v.optional(v.string()),  // College / Company
    holderDepartment: v.optional(v.string()),   // Branch / Dept
    holderDob: v.optional(v.string()),          // YYYY-MM-DD — used for secure download link auth

    // ── Certificate Details ───────────────────────────────────
    // Types: internship | employment | course | partnership | appreciation | other
    certificateType: v.string(),
    role: v.string(),                            // Designation / Role
    product: v.optional(v.string()),             // e.g. WaveBase AI
    reportingTo: v.optional(v.string()),
    workMode: v.optional(v.string()),            // Remote | On-site | Hybrid

    // ── Dates ─────────────────────────────────────────────────
    issuedDate: v.string(),                      // YYYY-MM-DD
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),          // null = never expires

    // ── Issuer ────────────────────────────────────────────────
    issuerName: v.string(),
    issuerTitle: v.string(),

    // ── Status ────────────────────────────────────────────────
    // Values: active | revoked | expired
    status: v.string(),
    revokedDate: v.optional(v.string()),
    revokedReason: v.optional(v.string()),

    notes: v.optional(v.string()),
    nameFont: v.optional(v.string()),     // cursive | serif | modern
    templateData: v.optional(v.string()), // JSON string — full set of fields used to generate the document
    signedUrl: v.optional(v.string()),    // URL to the uploaded signed document copy
    signedAt: v.optional(v.string()),     // Timestamp when the signed document was uploaded
    employeeId: v.optional(v.id("employees")),    // the person this certificate was issued to
    businessId: v.optional(v.id("businesses")),   // issuing business (absent on legacy rows = WaveSeed)
    verificationCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_certificate_id", ["certificateId"])
    .index("by_reference_number", ["referenceNumber"])
    .index("by_holder_name", ["holderName"])
    .index("by_status", ["status"])
    .index("by_type", ["certificateType"])
    .index("by_business", ["businessId"])
    .index("by_employee", ["employeeId"]),

  // ── Businesses: parent company + ventures (tree via parentId) ──────────────
  // Optional branding fields mean "inherit from parent".
  businesses: defineTable({
    code:        v.string(),                       // WS, WSG … unique; never change once IDs are issued
    slug:        v.string(),                       // url-safe: "waveseed-growth"
    parentId:    v.optional(v.id("businesses")),   // absent = top-level (parent company)
    displayName: v.string(),
    tagline:     v.optional(v.string()),
    legalName:   v.optional(v.string()),
    address:     v.optional(v.string()),
    phone:       v.optional(v.string()),
    registrationNo: v.optional(v.string()),   // CIN / company registration number printed in the letter footer
    website:     v.optional(v.string()),
    email:       v.optional(v.string()),
    brandColor:  v.optional(v.string()),
    logoStorageId:      v.optional(v.string()),
    sealStorageId:      v.optional(v.string()),
    signatureStorageId: v.optional(v.string()),
    signatoryName:  v.optional(v.string()),
    signatoryTitle: v.optional(v.string()),
    products:    v.optional(v.array(v.string())),   // product / project names offered in forms (NOT inherited)
    active:      v.boolean(),
    createdAt:   v.number(),
    updatedAt:   v.number(),
  })
    .index("by_code", ["code"])
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"]),

  employees: defineTable({
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
    employeeType: v.string(), // "intern" | "employee"
    status: v.string(),       // "active" | "former"
    meta: v.optional(v.string()), // JSON string with extended profile data
    businessId: v.optional(v.id("businesses")),   // which business this person belongs to
    empCode: v.optional(v.string()), // WS-INT-2026-0001 / WS-EMP-2026-0001 (set at creation; absent on legacy profiles)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_emp_code", ["empCode"])
    .index("by_business", ["businessId"])
    .index("by_type", ["employeeType"])
    .index("by_status", ["status"]),

  // ── Uploaded KYC / onboarding documents ──────────────────────────────────
  documents: defineTable({
    employeeId:   v.id("employees"),    // links to employees table
    // docType values: govt_id | college_id | marksheet | photo | bank | pan | degree | experience
    docType:      v.string(),
    storageId:    v.string(),           // Convex file storage ID
    fileName:     v.string(),           // original filename (sanitised)
    mimeType:     v.string(),
    sizeBytes:    v.number(),           // compressed size
    uploadedAt:   v.number(),
    uploadedByIp: v.optional(v.string()),
    verified:     v.optional(v.boolean()),   // HR has checked this document
    verifiedAt:   v.optional(v.number()),
  })
    .index("by_employee",   ["employeeId"])
    .index("by_emp_type",   ["employeeId", "docType"]),

  // Change history for business settings (branding / signatory edits end up on legal letters)
  businessAuditLogs: defineTable({
    businessId: v.id("businesses"),
    action:     v.string(),                 // create | update | image_set | image_clear
    fields:     v.array(v.string()),        // names of fields changed (values are not stored)
    role:       v.string(),
    at:         v.number(),
  }).index("by_business", ["businessId", "at"]),

  // Atomic sequence counters (e.g. "emp:INT:2026")
  counters: defineTable({
    key:   v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  // ── Who accessed which KYC document (audit trail) ─────────────────────────
  docAccessLogs: defineTable({
    employeeId: v.id("employees"),
    action:     v.string(),                 // view_list | view_file | verify | unverify | delete
    docType:    v.optional(v.string()),
    role:       v.string(),                 // admin | hr | ... (session role)
    at:         v.number(),
  }).index("by_employee", ["employeeId", "at"]),

  // Admin portal sessions — only the SHA-256 hash of the token is stored
  sessions: defineTable({
    tokenHash: v.string(),
    role: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_expires_at", ["expiresAt"]),

  // Brute-force / spam protection counters (login, DOB checks, onboarding)
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
    lockedUntil: v.number(),
  }).index("by_key", ["key"]),
});
