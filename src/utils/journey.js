// ─── journey.js — shared pieces of the candidate journey ─────────────────────
// accept offer (#accept) → upload documents (#upload) → welcome (#welcome)
import { generateDocument, generateSignedCopy } from '../templates/templates.js';
import { LOGO_URL } from '../templates/assets.js';
import { icon } from '../ui/icons.js';

export const esc = (s) => (s == null ? '' : String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'));

// ── Session: lets the three pages hand the candidate over without asking again ──
const KEY = 'ws_journey';
export function getJourney() {
  try { const j = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return j && j.ref && j.dob ? j : null; } catch { return null; }
}
export function setJourney(o) { try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch { /* private mode */ } }
export function patchJourney(p) { setJourney({ ...(getJourney() || {}), ...p }); }
export function clearJourney() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

// ── Dates ─────────────────────────────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '';
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00') : new Date(d);
  return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function fmtIST(ms) {
  const s = new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  return s.replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM') + ' IST';
}
export function daysUntil(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - t) / 86400000);
}

// ── The offer as a document ───────────────────────────────────────────────────
export function offerData(r) {
  let d = {};
  if (r.templateData) { try { d = JSON.parse(r.templateData); } catch { d = {}; } }
  Object.assign(d, {
    certId: r.certificateId, refNum: r.referenceNumber, holderName: r.holderName, recipientName: r.holderName,
    recipientEmail: r.holderEmail || d.recipientEmail || '',
    recipientCollege: r.holderInstitution || d.recipientCollege || '', recipientDept: r.holderDepartment || d.recipientDept || '',
    role: r.role, product: r.product || d.product || '', reportingTo: r.reportingTo || d.reportingTo || '',
    workMode: r.workMode || d.workMode || '', issuedDate: r.issuedDate || d.issuedDate || '', date: r.issuedDate || d.date || '',
    startDate: r.startDate || d.startDate || '', endDate: r.endDate || d.endDate || '',
    issuerName: r.issuerName, issuerTitle: r.issuerTitle, verificationId: r.certificateId,
  });
  return d;
}
export const offerHtml = (r) => generateDocument(r.certificateType, offerData(r));
export const signedCopyHtml = (r, rec) => generateSignedCopy(r.certificateType, offerData(r), rec);

/** Inline preview: links open in a new tab, no print button, nothing runs. */
export function previewDoc(html) {
  return html
    .replace('<head>', '<head><base target="_blank"/><style>.print-btn{display:none!important} html{background:#fff!important} body{width:auto!important;min-height:0!important;margin:0!important;padding:22px 24px 28px!important;box-shadow:none!important;font-size:10pt!important} .lh{flex-wrap:wrap;gap:12px!important} .lh-contact{text-align:left!important} .meta{flex-wrap:wrap} .meta-r{text-align:left!important} .highlight-table td:first-child{width:38%!important} .verify{flex-wrap:wrap}</style>')
    .replace(/<body([^>]*)>/, '<body$1>');
}

export function openDoc(html) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}

// ── Browser helpers ───────────────────────────────────────────────────────────
export function getGeo(timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ status: 'unavailable' });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ status: 'granted', lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => resolve({ status: e && e.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export async function shrinkImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } finally { URL.revokeObjectURL(url); }
}

// ── Page shell: brand bar, hero with stepper, content slot ────────────────────
export const STEPS = ['Verify', 'Review', 'Accept', 'Documents', 'Welcome'];

export function logoOf(issuer) { return (issuer && issuer.logoUrl) || LOGO_URL; }

function brandBar(issuer) {
  const v = issuer && issuer.venture;
  const txt = v
    ? `<b>${esc(v.name)}</b><span>A venture of ${esc(issuer.legal || issuer.name)}</span>`
    : (issuer && issuer.tagline ? `<span>${esc(issuer.tagline)}</span>` : '');
  return `<header class="jy-top"><div class="jy-top-in">
    <a class="jy-brand" href="#" aria-label="${esc((issuer && issuer.name) || 'WaveSeed Co.')}">
      <img src="${esc(logoOf(issuer))}" alt="${esc((issuer && issuer.name) || 'WaveSeed Co.')} logo"/>
      ${txt ? `<div class="jy-brand-txt">${txt}</div>` : ''}
    </a>
    <span class="jy-secure">${icon('lock', { size: 14 })} Secure &amp; private</span>
  </div></header>`;
}

const WAVES = `<svg class="jy-waves" viewBox="0 0 1200 84" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<path d="M0 ${44 + i * 6} C 150 ${10 + i * 4}, 300 ${78 - i * 3}, 450 ${42 + i * 2} S 750 ${6 + i * 5}, 900 ${46 - i} S 1100 ${70 - i * 4}, 1200 ${34 + i * 3}" fill="none" stroke="#fff" stroke-width="1.2" opacity="${1 - i * 0.16}"/>`).join('')}</svg>`;

export function stepperHTML(now) {
  return `<ol class="jy-steps" aria-label="Progress">${STEPS.map((s, i) => {
    const n = i + 1, cls = n < now ? 'done' : n === now ? 'now' : '';
    return `<li class="jy-step ${cls}"${n === now ? ' aria-current="step"' : ''}><i>${n < now ? icon('check', { size: 14, stroke: 3 }) : n}</i><span>${s}</span></li>`;
  }).join('')}</ol>`;
}

export function demoBannerHTML() {
  return `<div class="jy-demo" role="note"><span>${icon('wand', { size: 15 })} <b>Demo mode</b> — a sample offer. Nothing is saved, uploaded or sent.</span><span><button data-demo="restart">Restart</button><button data-demo="exit">Exit demo</button></span></div>`;
}

export function bindDemo(root) {
  root.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => {
    const restart = b.dataset.demo === 'restart';
    const j = getJourney() || {};
    clearJourney();
    if (!restart) { location.hash = ''; return; }
    const q = new URLSearchParams({ demo: '1' });
    if (j.biz) q.set('biz', j.biz);
    if (j.type) q.set('type', j.type);
    const h = '#accept?' + q.toString();
    if (location.hash === h) location.reload(); else location.hash = h;
  }));
}

export function mountShell(app, issuer, { demo = false } = {}) {
  app.innerHTML = `<div class="ws-app jy">
    ${demo ? demoBannerHTML() : ''}
    ${brandBar(issuer)}
    <section class="jy-hero" id="jy-hero">${WAVES}<div class="jy-hero-in" id="jy-hero-in"></div></section>
    <main class="jy-main" id="jy-main"></main>
    <footer class="jy-foot" id="jy-foot"></footer>
  </div>`;
  if (demo) bindDemo(app);
  const foot = app.querySelector('#jy-foot');
  const mail = issuer && issuer.email ? `<a href="mailto:${esc(issuer.email)}">${esc(issuer.email)}</a>` : '';
  foot.innerHTML = `${mail ? `Need help? Write to ${mail}. ` : ''}${esc((issuer && (issuer.legal || issuer.name)) || 'WaveSeed Co.')} · Your details are used only for your onboarding.`;
  return {
    main: app.querySelector('#jy-main'),
    setHero({ eyebrow = '', title = '', sub = '', step = 1, venture = null }) {
      app.querySelector('#jy-hero-in').innerHTML = `
        ${eyebrow ? `<div class="jy-eyebrow">${icon('sparkles', { size: 14 })} ${esc(eyebrow)}</div>` : ''}
        <h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}
        ${stepperHTML(step)}`;
      window.scrollTo({ top: 0 });
    },
  };
}

export const spinner = '<span class="jy-spin" aria-hidden="true"></span>';
export const alertBox = (kind, text, ic = 'alert-circle') => `<div class="jy-alert ${kind}" role="${kind === 'err' ? 'alert' : 'status'}">${icon(ic, { size: 18 })}<div>${text}</div></div>`;
