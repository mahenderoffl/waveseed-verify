// ─── acceptances.ts — offer acceptance records (electronic acceptance / signed copy / decline) ──
// An acceptance row is evidence. Rows are only ever inserted, never edited: each carries the exact
// consent wording shown, a SHA-256 of the offer as it stood at that moment, the server-side time
// and the requester's IP address. Decline and accept are separate rows; the newest one wins.
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Version the wording whenever it changes: every record keeps the exact text it was given.
export const CONSENT_VERSION = "2026.1";

export const CONSENT_CLAUSE_TITLE = "Electronic acceptance (e-signature) clause";
export const CONSENT_CLAUSE =
  "By typing my full name and selecting “Sign and accept”, I am signing this offer electronically. " +
  "I understand that my typed name is my signature, that it is given of my own free will and with full understanding, " +
  "and that this acceptance is legally binding on me in the same way as a handwritten signature. " +
  "It is an agreement concluded by electronic means and is recognised under the Information Technology Act, 2000 " +
  "(including Section 10A) and the Indian Contract Act, 1872.";

export const CONSENTS: { id: string; text: string }[] = [
  { id: "read", text: "I have read and understood this offer letter in full, including its annexure, terms and conditions and any additional terms stated in it." },
  { id: "voluntary", text: "I am accepting this offer of my own free will. No one has pressured, induced or misled me into doing so." },
  { id: "esign", text: "I agree that typing my full name below is my electronic signature, with the same legal effect as my handwritten signature, as set out in the clause above." },
  { id: "truth", text: "The details and documents I have given, or will give, to the company are true, complete and my own. I understand that false information can lead to this offer being withdrawn or my association being ended." },
  { id: "record", text: "I consent to the company recording the date and time, my IP address, my device and browser details and, only if I choose to share it, my location, as evidence of this acceptance and to prevent fraud." },
];

export const PRIVACY_NOTICE =
  "What we record and why: the exact time of your acceptance (taken from our server, not your device), your IP address, your browser and device type, and, only if you allow it, your approximate location. " +
  "We keep this with your offer as proof that you accepted it, and to protect you and the company against impersonation and disputes. " +
  "It is kept for as long as your association with the company, and the legally required period afterwards. It is visible only to authorised HR staff and is never sold or used for marketing. " +
  "You may ask the company to correct your details at any time through the contact address on your offer letter.";

export const getForCertificate = internalQuery({
  args: { certificateDocId: v.id("certificates") },
  handler: async (ctx, { certificateDocId }) => {
    const rows = await ctx.db.query("acceptances").withIndex("by_certificate", (q) => q.eq("certificateDocId", certificateDocId)).collect();
    rows.sort((a, b) => b.acceptedAt - a.acceptedAt);
    return rows;
  },
});

/** The decision that currently stands for a certificate (accepted rows are final). */
export const standing = internalQuery({
  args: { certificateDocId: v.id("certificates") },
  handler: async (ctx, { certificateDocId }) => {
    const rows = await ctx.db.query("acceptances").withIndex("by_certificate", (q) => q.eq("certificateDocId", certificateDocId)).collect();
    if (!rows.length) return null;
    const accepted = rows.filter((r) => r.decision === "accepted").sort((a, b) => a.acceptedAt - b.acceptedAt)[0];
    if (accepted) return accepted;
    return rows.sort((a, b) => b.acceptedAt - a.acceptedAt)[0];
  },
});

export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("acceptances").collect();
    rows.sort((a, b) => b.acceptedAt - a.acceptedAt);
    return rows;
  },
});

export const record = internalMutation({
  args: {
    certificateDocId: v.id("certificates"),
    decision: v.string(),                 // accepted | declined
    method: v.string(),                   // electronic | signed_copy | decline
    signedName: v.optional(v.string()),
    consentVersion: v.optional(v.string()),
    consentClause: v.optional(v.string()),
    consentTexts: v.optional(v.array(v.string())),
    privacyNotice: v.optional(v.string()),
    docHash: v.string(),
    ip: v.string(),
    userAgent: v.string(),
    language: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    geoStatus: v.string(),                // granted | denied | unavailable | not_requested
    geoLat: v.optional(v.number()),
    geoLon: v.optional(v.number()),
    geoAccuracyM: v.optional(v.number()),
    reason: v.optional(v.string()),
    signedFileUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certificateDocId);
    if (!cert) throw new Error("Document not found");
    const existing = await ctx.db.query("acceptances").withIndex("by_certificate", (q) => q.eq("certificateDocId", args.certificateDocId)).collect();
    if (existing.some((r) => r.decision === "accepted")) throw new Error("This offer has already been accepted.");

    const now = Date.now();
    const receiptId = "ACC-" + cert.certificateId.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase() + "-" + now.toString(36).toUpperCase().slice(-5);
    const { certificateDocId, ...rest } = args;
    await ctx.db.insert("acceptances", {
      ...rest,
      certificateDocId,
      certificateId: cert.certificateId,
      referenceNumber: cert.referenceNumber,
      holderName: cert.holderName,
      businessId: cert.businessId,
      employeeId: cert.employeeId,
      receiptId,
      acceptedAt: now,
    });
    return { receiptId, acceptedAt: now };
  },
});
