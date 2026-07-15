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
    verificationCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_certificate_id", ["certificateId"])
    .index("by_reference_number", ["referenceNumber"])
    .index("by_holder_name", ["holderName"])
    .index("by_status", ["status"])
    .index("by_type", ["certificateType"]),

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_type", ["employeeType"])
    .index("by_status", ["status"]),
});
