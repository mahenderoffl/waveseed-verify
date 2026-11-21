// ─── demo.js — "try it yourself" mode for the candidate journey ───────────────
// #accept?demo=1  (optional: &biz=wsg  &type=employee  &name=Your Name)
// Runs the whole journey (offer → sign → documents → welcome) with a sample offer.
// Nothing is saved, uploaded or sent: every call that would reach the server is answered here.
import { getJourney } from './journey.js';

const HTTP_URL = 'https://enchanted-hamster-869.convex.site';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoPlus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export const isDemo = () => { const j = getJourney(); return !!(j && j.demo); };

let consentCache = null;
async function consent() {
  if (consentCache) return consentCache;
  const res = await fetch(`${HTTP_URL}/public/accept/consent`);
  consentCache = await res.json();
  return consentCache;
}

/** A sample lookup result shaped exactly like the real /public/accept/lookup response. */
export async function demoLookup(opts = {}) {
  const j = getJourney() || {};
  const biz = (opts.biz || j.biz || 'ws').toLowerCase();
  const type = (opts.type || j.type || 'intern') === 'employee' ? 'employee' : 'intern';
  const name = clean(opts.name || j.name || 'Demo Candidate', 60) || 'Demo Candidate';
  const isV = biz === 'wsg';
  const start = isoPlus(14), end = isoPlus(14 + 90), valid = isoPlus(7);
  const refNum = isV ? 'DEMO/WSG/OFFER/001' : 'DEMO/WS/OFFER/001';
  const certId = isV ? 'DEMO-WSG-OFFER-0001' : 'DEMO-WS-OFFER-0001';
  const role = type === 'employee' ? 'Business Development Manager' : 'Growth Marketing Intern';
  const brand = {
    code: isV ? 'WSG' : 'WS', name: 'WaveSeed Co.', legal: 'WaveSeed Co.',
    tagline: 'Seeding the next wave. An AI product studio.', website: isV ? 'growth.waveseed.co' : 'www.waveseed.co', email: 'support@waveseed.co',
    sigName: 'Mahender Banoth', sigTitle: 'Founder, CEO',
    venture: isV ? { code: 'WSG', name: 'WaveSeed Growth', tagline: 'Turning ambition into momentum.', logo: '' } : null,
  };
  const td = {
    recipientName: name, role, refNum, startDate: start, joiningDate: start, endDate: type === 'employee' ? '' : end,
    duration: type === 'employee' ? '' : '3 Months', workMode: 'Hybrid', workLocation: 'To be confirmed on joining', reportingTo: 'Your reporting manager',
    stipend: '₹10,000 per month', ctc: '₹6 LPA', probation: type === 'employee' ? '3 Months' : '15 days', noticePeriod: type === 'employee' ? '60 days' : '15 days',
    offerValidity: valid, empCode: isV ? 'WSG-DEMO-0001' : 'WS-DEMO-0001',
    additionalTerms: 'This is a demonstration offer created to show how acceptance works. It is not a real offer and nothing in it is binding.',
    brand,
  };
  const c = await consent();
  return {
    success: true,
    certificateType: type === 'employee' ? 'employment-offer' : 'internship-offer',
    templateData: JSON.stringify(td),
    certificateId: certId, referenceNumber: refNum, holderName: name, holderEmail: 'demo.candidate@example.com',
    holderInstitution: '', holderDepartment: '', role, product: '', reportingTo: td.reportingTo, workMode: td.workMode,
    issuedDate: isoPlus(0), startDate: start, endDate: td.endDate, issuerName: 'Mahender Banoth', issuerTitle: 'Founder, CEO',
    employeeType: type,
    issuer: { name: 'WaveSeed Co.', legal: 'WaveSeed Co.', tagline: brand.tagline, logoUrl: null, email: 'support@waveseed.co', website: brand.website, sigName: 'Mahender Banoth', sigTitle: 'Founder, CEO', venture: brand.venture },
    validUntil: valid, expired: false,
    acceptance: j.demoRec ? { ...j.demoRec, state: 'accepted' } : { state: 'pending' },
    signedUrl: null,
    consent: c,
    demo: true,
  };
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pretend to record a response. Returns the same shape the real endpoint does. */
export async function demoSubmit(payload, r) {
  await sleep(700);
  const now = Date.now();
  const receiptId = 'DEMO-' + now.toString(36).toUpperCase().slice(-6);
  if (payload.decision === 'decline') return { success: true, decision: 'declined', receiptId, acceptedAt: now };
  if (payload.method === 'electronic') {
    const typed = clean(payload.signedName, 120);
    const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (norm(typed) !== norm(r.holderName)) throw Object.assign(new Error(`Please type your full name exactly as it appears on the offer: ${r.holderName}`), { status: 400 });
    const needed = (r.consent.items || []).length;
    if (!Array.isArray(payload.consents) || payload.consents.length !== needed) throw Object.assign(new Error('Please tick every declaration before signing.'), { status: 400 });
  }
  return {
    success: true, decision: 'accepted', method: payload.method, receiptId, acceptedAt: now,
    ip: 'Demo – not recorded', docHash: await sha256(r.templateData + r.certificateId), signedName: payload.signedName || r.holderName,
  };
}

export async function demoUploadSigned() { await sleep(900); return { success: true }; }
