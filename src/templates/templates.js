// ─── templates.js — All printable document HTML generators ────────────────────
import { LOGO_URL, SIG_URL, STAMP_URL } from './assets.js';

// ─── Brand (issuer identity) ──────────────────────────────────────────────────
// Documents store a snapshot of the issuing business's branding in data.brand, so
// letters re-render exactly as issued even if Settings change later. No snapshot
// (legacy documents) = the original WaveSeed look.
const DEFAULT_BRAND = {
  code: 'WS', name: 'WaveSeed Co.', legal: 'WaveSeed Co.',
  tagline: "Building Tomorrow's Wave, Today",
  website: 'www.waveseed.co', email: 'support@waveseed.co', address: '',
  color: '#0d1b3e',
  logo: LOGO_URL, seal: STAMP_URL, sigImage: SIG_URL,
  sigName: 'Mahender Banoth', sigTitle: 'Founder, CEO',
  sigAffil: 'Indian Institute of Technology Patna',
};

const okImg = u => (typeof u === 'string' && (/^https:\/\//.test(u) || /^data:image\/(png|jpeg|webp);base64,/.test(u))) ? u.replace(/"/g, '%22') : '';
const okHex = c => /^#[0-9a-f]{6}$/i.test(c || '');

function lighten(hex, amt = 0.14) {
  const n = parseInt(hex.slice(1), 16);
  const mix = v => Math.round(v + (255 - v) * amt);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function buildBrand(snap) {
  const D = DEFAULT_BRAND;
  const s = snap && typeof snap === 'object' ? snap : null;
  const e = x => (x === null || x === undefined ? '' : String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'));
  const name = (s && s.name) || D.name;
  const sigName = (s && s.sigName) || D.sigName;
  const isFounder = sigName === D.sigName;
  const website = ((s && s.website) || D.website).replace(/^https?:\/\//i, '');
  const color = s && okHex(s.color) ? s.color.toLowerCase() : D.color;
  return {
    code: e((s && s.code) || D.code),
    name: e(name),
    short: e(name.replace(/\s+(Co\.?|Inc\.?|Ltd\.?|Pvt\.? Ltd\.?)$/i, '')),   // "WaveSeed Co." -> "WaveSeed"
    legal: e((s && s.legal) || name),
    legalDot: e(/[.!?]$/.test((s && s.legal) || name) ? ((s && s.legal) || name) : ((s && s.legal) || name) + '.'),   // for sentence endings
    tagline: e(s ? (s.tagline || '') : D.tagline),
    website: e(website),
    siteUrl: 'https://' + encodeURI(website).replace(/"/g, ''),
    email: e((s && s.email) || D.email),
    address: e((s && s.address) || D.address).replace(/\n/g, '<br/>'),
    phone: e((s && s.phone) || ''),
    reg: e((s && s.reg) || ''),
    // A venture's documents carry the parent's letterhead; the venture is shown as a sub-head
    venture: (s && s.venture && s.venture.name)
      ? { name: e(s.venture.name), code: e(s.venture.code || ''), tagline: e(s.venture.tagline || ''), logo: okImg(s.venture.logo) || '' }
      : null,
    color,
    colorLight: color === D.color ? '#1e3264' : lighten(color),   // default keeps the original navy gradient
    logo: (s && okImg(s.logo)) || D.logo,
    logoHasName: !(s && okImg(s.logo)),   // the bundled WaveSeed logo already carries the wordmark
    seal: (s && okImg(s.seal)) || D.seal,
    sigName: e(sigName),
    sigTitle: e((s && s.sigTitle) || D.sigTitle),
    sigImage: s && s.sigImage ? okImg(s.sigImage) : (isFounder ? D.sigImage : ''),
    sigAffil: isFounder ? e(D.sigAffil) : '',
  };
}

let B = buildBrand(null);
function setBrand(snap) { B = buildBrand(snap); }

// Intern / Employee ID of the person the letter is for (printed next to the reference number when known)
let EMP_CODE = '';

/**
 * Build the snapshot to store with a document from a business record returned by
 * the admin businesses API (uses its resolved, inherited values).
 */
export function brandSnapshot(business, parent) {
  if (!business || !business.effective) return undefined;
  // Letterhead identity = the parent company; a venture is a sub-head under it.
  const isVenture = !!(business.parentId && parent && parent.effective && parent.id !== business.id);
  const p = isVenture ? parent : business;
  const ep = p.effective, eb = business.effective;
  const val = (o, k) => (o && o[k] && o[k].value) || '';
  const own = (k) => eb[k] && eb[k].from === business.code;      // set on the venture itself, not inherited
  return {
    code: business.code,                       // the issuing business (drives numbering and WaveSeed-only defaults)
    name: p.displayName,
    legal: val(ep, 'legalName') || p.displayName,
    tagline: val(ep, 'tagline'),
    website: val(eb, 'website') || val(ep, 'website'),   // a venture shows its own site (falls back to the parent's)
    email: val(eb, 'email') || val(ep, 'email'),
    address: val(ep, 'address'),
    phone: val(ep, 'phone'),
    reg: val(ep, 'registrationNo'),
    color: val(ep, 'brandColor'),
    logo: val(ep, 'logo'),
    seal: val(eb, 'seal'),
    sigName: eb.signatory.name || '',
    sigTitle: eb.signatory.title || '',
    sigImage: eb.signatory.signature || '',
    venture: isVenture ? { code: business.code, name: business.displayName, tagline: own('tagline') ? val(eb, 'tagline') : '', logo: own('logo') ? val(eb, 'logo') : '' } : null,
  };
}


// ─── Shared Assets ─────────────────────────────────────────────────────────────
const GF = `https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap`;

// Header logo in black
const LOGO_HTML = () => `
<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
  <img src="${B.logo}" alt="${B.name} logo" style="height:56px;object-fit:contain;" />
  <div style="font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:${B.color};letter-spacing:0.5px;line-height:1;margin-top:2px;">${B.name}</div>
  <div style="font-family:'Inter',sans-serif;font-size:8px;color:#666;letter-spacing:2px;text-transform:uppercase;line-height:1;margin-top:2px;">${B.tagline}</div>
</div>`;


function sealSVG(type) {
  const labels = {
    internship:   ['INTERNSHIP','COMPLETION'],
    employment:   ['EMPLOYMENT','CONFIRMED'],
    course:       ['COURSE','COMPLETION'],
    appreciation: ['APPRECIATION','AWARD'],
    achievement:  ['EXCELLENCE','AWARD'],
    volunteer:    ['VOLUNTEER','RECOGNITION'],
    partnership:  ['PARTNERSHIP','CERTIFICATE'],
    default:      ['CERTIFICATE','OF MERIT'],
  };
  const [l1, l2] = labels[type] || labels.default;
  return `
<svg viewBox="0 0 110 110" width="105" height="105" xmlns="http://www.w3.org/2000/svg">
  <!-- Glowing gold background -->
  <circle cx="55" cy="55" r="50" fill="url(#goldGradient)" stroke="#c9a227" stroke-width="1.5"/>
  <circle cx="55" cy="55" r="44" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="3,2" opacity="0.6"/>
  <circle cx="55" cy="55" r="39" fill="none" stroke="${B.color}" stroke-width="1" opacity="0.15"/>
  <!-- Laurel leaves -->
  <g fill="${B.color}" opacity="0.75">
    ${Array.from({length:18},(_,i)=>{
      const a=(i/18)*2*Math.PI-Math.PI/2;
      const r=46;
      const x=55+r*Math.cos(a);
      const y=55+r*Math.sin(a);
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2" ry="1" transform="rotate(${(i/18*360).toFixed(0)},${x.toFixed(1)},${y.toFixed(1)})"/>`;
    }).join('')}
  </g>
  <!-- Center elements -->
  <polygon points="55,20 57.5,27.5 65,27.5 59,32 61.5,39.5 55,35 48.5,39.5 51,32 45,27.5 52.5,27.5" fill="${B.color}"/>
  <text x="55" y="55" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="${B.color}" letter-spacing="1">${l1}</text>
  <text x="55" y="66" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="${B.color}" letter-spacing="1">${l2}</text>
  <polygon points="55,82 56.5,87 61,87 57.5,89.5 59,95 55,92 51,95 52.5,89.5 49,87 53.5,87" fill="${B.color}"/>
  
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff0cc" />
      <stop offset="50%" stop-color="#e3bc54" />
      <stop offset="100%" stop-color="#b88f28" />
    </linearGradient>
  </defs>
</svg>`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
}
function today() { return fmtDate(new Date().toISOString().split('T')[0]); }
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
// Tenure still running: flagged "currently working" and no end date recorded.
// An end date added later (e.g. via the admin Edit modal) wins, reverting to past tense.
function isOngoing(d) { return d.currentlyWorking === 'yes' && !!d.startDate && !d.endDate; }

// Purpose of an experience / service letter. Tolerates custom text typed as
// "for higher studies" or "Purpose: visa." so the sentence never doubles up.
export function cleanPurpose(p) {
  return String(p || '').trim()
    .replace(/^purpose\s*[:\-–]\s*/i, '')
    .replace(/^(for\s+)?(the\s+)?purpose\s+of\s+/i, '')
    .replace(/^for\s+/i, '')
    .replace(/[.\s]+$/, '');
}
export function isEducationPurpose(p) {
  return /educat|stud(y|ies)|admission|universit|college|school|scholar|course|degree|master|\bm\.?s\b|\bmba\b|ph\.?d/i.test(p || '');
}
// Wording after "issued upon their request …" — plain text; caller escapes for HTML.
export function purposeClause(purpose, ongoing) {
  const p = cleanPurpose(purpose);
  if (p) return { lead: 'for the purpose of ', value: p };
  return { lead: ongoing
    ? 'for their personal records and for submission to any educational institution, employer, bank, embassy, or other authority as may be required'
    : 'for their personal records, future employment, and academic pursuits', value: '' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMPLETION CERTIFICATE (Internship, Course, Employment, Appreciation, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
export function certificateTemplate(data) {
  const {
    certId='', refNum='', holderName='', holderInstitution='', holderDepartment='',
    certType='internship', role='', product=(B.code === 'WS' ? 'WaveBase AI' : ''), workMode='', reportingTo='',
    startDate='', endDate='', issuedDate='', issuerName=B.sigName,
    issuerTitle=`${B.sigTitle}, ${B.legal}`, customMessage='', nameFont='cursive',
  } = data;

  const nameLen = holderName.length;
  let nameFontSize = '66px';
  let nameFontFamily = "'Great Vibes', cursive";
  let nameFontStyle = "normal";
  let nameFontWeight = "400";
  let nameLetterSpacing = "normal";

  if (nameFont === 'serif') {
    nameFontFamily = "'Playfair Display', 'Georgia', serif";
    nameFontStyle = "italic";
    nameFontWeight = "700";
    nameLetterSpacing = "0.5px";
    if (nameLen > 28) {
      nameFontSize = '34px';
    } else if (nameLen > 20) {
      nameFontSize = '42px';
    } else {
      nameFontSize = '50px';
    }
  } else if (nameFont === 'modern') {
    nameFontFamily = "'Dancing Script', cursive";
    nameFontStyle = "normal";
    nameFontWeight = "700";
    nameLetterSpacing = "0.5px";
    if (nameLen > 28) {
      nameFontSize = '38px';
    } else if (nameLen > 20) {
      nameFontSize = '48px';
    } else {
      nameFontSize = '60px';
    }
  } else {
    // Default cursive
    if (nameLen > 28) {
      nameFontSize = '42px';
    } else if (nameLen > 20) {
      nameFontSize = '52px';
    } else {
      nameFontSize = '66px';
    }
  }

  const typeLabels = {
    internship:   { of:'COMPLETION', badge:'INTERNSHIP', verb:'completed the internship' },
    employment:   { of:'EMPLOYMENT', badge:'EMPLOYMENT', verb:'been employed' },
    course:       { of:'COMPLETION', badge:'COURSE', verb:'completed the course' },
    appreciation: { of:'APPRECIATION', badge:'APPRECIATION', verb:'demonstrated exemplary dedication' },
    achievement:  { of:'EXCELLENCE', badge:'EXCELLENCE', verb:'demonstrated outstanding excellence' },
    volunteer:    { of:'RECOGNITION', badge:'VOLUNTEER', verb:'contributed as a volunteer' },
    partnership:  { of:'PARTNERSHIP', badge:'PARTNERSHIP', verb:'entered into a formal partnership' },
    other:        { of:'ACHIEVEMENT', badge:'ACHIEVEMENT', verb:'fulfilled the requirements' },
  };
  const t = typeLabels[certType] || typeLabels.other;

  const period = isOngoing(data)
    ? ` since <strong>${fmtDate(startDate)}</strong> and continues to serve with the organisation as on <strong>${fmtDate(issuedDate)}</strong>`
    : (startDate && endDate) ? ` during the period of <strong>${fmtDate(startDate)} to ${fmtDate(endDate)}</strong>` : '';
  const bodyText = (customMessage ? esc(customMessage).replace(/\n/g, '<br>') : '') ||
    `has successfully ${t.verb} as <strong>${esc(role)}</strong>${product ? ` at <strong>${B.legal}</strong> on the <em>${esc(product)}</em> project` : ` at <strong>${B.legal}</strong>`}${period}.`;

  const verificationUrl = `https://verify.waveseed.app/?id=${certId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

  const sealBottom = t.of === t.badge ? 'CERTIFIED' : t.of;
  const NAVY = '#0B1F3A', GOLD = '#B8913A', INK = '#1a2433';
  const addrLine = [plain(B.address.replace(/<br\s*\/?>/g, ', ')), B.phone ? 'Tel ' + B.phone : '', B.reg ? 'CIN ' + B.reg : ''].filter(Boolean).join('  ·  ');

  // Guilloche wave band: dozens of interleaved sine lines, the brand's wave drawn as a security pattern
  const guilloche = (flip) => {
    const lines = [];
    for (let k = 0; k < 22; k++) {
      let d = '';
      for (let x = 0; x <= 1000; x += 8) {
        const env = 0.5 + 0.5 * Math.sin((x / 1000) * Math.PI * 3 + k * 0.17);
        const y = 22 + (7 + 11 * env) * Math.sin((x / 1000) * Math.PI * 14 + k * 0.29) * (k % 2 ? 0.92 : 1);
        d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1) + ' ';
      }
      lines.push(`<path d="${d}" fill="none" stroke="${k % 3 === 0 ? GOLD : NAVY}" stroke-width=".55" opacity="${k % 3 === 0 ? '.75' : '.42'}"/>`);
    }
    return `<svg class="band ${flip ? 'bot' : 'top'}" viewBox="0 0 1000 44" preserveAspectRatio="none">${lines.join('')}</svg>`;
  };
  const micro = `${B.name} · VERIFIED CREDENTIAL · `.toUpperCase().repeat(14);

  const sealHTML = `
  <svg viewBox="0 0 130 150" width="94" height="108" style="filter:drop-shadow(0 2px 3px rgba(120,90,20,.35))">
    <defs>
      <linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DFA0"/><stop offset=".45" stop-color="#C9A34A"/><stop offset="1" stop-color="#8F6D1E"/></linearGradient>
      <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14305c"/><stop offset="1" stop-color="#0B1F3A"/></linearGradient>
    </defs>
    <path d="M38 96 L26 148 L46 138 L56 150 L64 104 Z" fill="url(#rb)"/>
    <path d="M92 96 L104 148 L84 138 L74 150 L66 104 Z" fill="url(#rb)"/>
    <circle cx="65" cy="62" r="60" fill="url(#gf)"/>
    <circle cx="65" cy="62" r="56" fill="none" stroke="#fff6d8" stroke-width="1" stroke-dasharray="1.4 2.4" opacity=".9"/>
    <circle cx="65" cy="62" r="49" fill="none" stroke="#7a5c14" stroke-width=".6" opacity=".6"/>
    <circle cx="65" cy="62" r="33" fill="#fbf2d4" stroke="#8F6D1E" stroke-width=".8"/>
    <path id="s1" d="M 20,62 A 45,45 0 0,1 110,62" fill="none"/>
    <path id="s2" d="M 16,62 A 49,49 0 0,0 114,62" fill="none"/>
    <text font-family="Montserrat,sans-serif" font-weight="800" font-size="7.2" fill="#5b430c" letter-spacing="1.8"><textPath href="#s1" startOffset="50%" text-anchor="middle">${esc(t.badge)}</textPath></text>
    <text font-family="Montserrat,sans-serif" font-weight="800" font-size="7.2" fill="#5b430c" letter-spacing="1.8"><textPath href="#s2" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">${esc(sealBottom)}</textPath></text>
    <polygon points="65,40 70.2,55 86,55.2 73.4,64.6 78,79.6 65,70.6 52,79.6 56.6,64.6 44,55.2 59.8,55" fill="#8F6D1E"/>
  </svg>`;

  const facts = [
    role ? ['Role', esc(role)] : null,
    (!isOngoing(data) && startDate && endDate) ? ['Period', `${fmtDate(startDate)} – ${fmtDate(endDate)}`] : (isOngoing(data) && startDate ? ['Since', fmtDate(startDate)] : null),
    ['Date of issue', fmtDate(issuedDate || startDate)],
    ['Certificate no.', esc(certId)],
  ].filter(Boolean);
  const factsHTML = facts.map(([k, v]) => `<div class="f${k === 'Period' || k === 'Role' ? ' w' : ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate — ${esc(holderName)} — ${B.name}</title>
<link href="${GF}" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4 landscape; margin: 0; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ width:100%; min-height:100vh; background:#0b1326; font-family:'Montserrat',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; display:flex; align-items:center; justify-content:center; }
  body{ position:relative; padding:20px; overflow-y:auto; overflow-x:hidden; }

  .cert-paper{ width:297mm; height:210mm; flex-shrink:0; position:relative; overflow:hidden; background:radial-gradient(ellipse at 50% 42%, #ffffff 0%, #fffdf7 55%, #f8f2e2 100%); box-shadow:0 20px 50px rgba(0,0,0,.45); }
  @media (max-width:1200px){ .cert-paper{ transform:scale(.85); } }
  @media (max-width:1000px){ .cert-paper{ transform:scale(.7); } }
  @media (max-width:800px){ .cert-paper{ transform:scale(.55); } }
  @media (max-width:600px){ .cert-paper{ transform:scale(.42); } }

  /* frame: navy keyline, gold keyline */
  .frame1{ position:absolute; inset:12px; border:2px solid ${NAVY}; pointer-events:none; }
  .frame2{ position:absolute; inset:18px; border:.75px solid ${GOLD}; pointer-events:none; }
  .band{ position:absolute; left:19px; right:19px; width:calc(100% - 38px); height:40px; }
  .band.top{ top:19px; } .band.bot{ bottom:19px; transform:scaleY(-1); }
  .micro{ position:absolute; left:24px; right:24px; font-size:4.6px; letter-spacing:1.6px; color:${GOLD}; white-space:nowrap; overflow:hidden; font-weight:600; opacity:.85; line-height:1; }
  .micro.t{ top:62px; } .micro.b{ bottom:62px; }
  .watermark{ position:absolute; top:50%; left:50%; transform:translate(-50%,-48%); width:430px; height:430px; background:url("${B.logo}") center/contain no-repeat; opacity:.035; pointer-events:none; }

  .content{ position:absolute; left:64px; right:64px; top:70px; bottom:70px; display:flex; flex-direction:column; align-items:center; text-align:center; }
  .head{ display:flex; flex-direction:row; justify-content:space-between; align-items:center; width:100%; }
  .head img{ height:132px; max-width:300px; object-fit:contain; margin:-24px 0 -22px -12px; }
  .head .hr{ text-align:right; max-width:340px; }
  .head .org{ font:700 13px 'Cormorant Garamond',serif; letter-spacing:3px; text-transform:uppercase; color:${NAVY}; margin-bottom:4px; }
  .head .tag{ font-size:8px; font-weight:600; letter-spacing:2.6px; text-transform:uppercase; color:#8a8f9c; }
  .head .vent{ font-size:9px; font-weight:700; letter-spacing:2.2px; text-transform:uppercase; color:#8A6A1C; margin-top:6px; }
  .head .vent span{ color:#8a8f9c; font-weight:600; }

  .title{ margin-top:8px; }
  .title h1{ font-family:'Cormorant Garamond','Cinzel',serif; font-size:34px; font-weight:700; letter-spacing:11px; padding-left:11px; color:${NAVY}; line-height:1; text-transform:uppercase; }
  .title .of{ display:flex; align-items:center; justify-content:center; gap:14px; margin-top:8px; }
  .title .of i{ display:block; width:70px; height:1px; background:linear-gradient(90deg,transparent,${GOLD}); }
  .title .of i:last-child{ background:linear-gradient(270deg,transparent,${GOLD}); }
  .title .of b{ font-size:11px; font-weight:700; letter-spacing:6px; padding-left:6px; text-transform:uppercase; color:#8A6A1C; }

  .mid{ flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; }
  .certify{ font-family:'Cormorant Garamond',serif; font-style:italic; font-size:15px; font-weight:500; color:#6b7280; letter-spacing:.5px; }
  .name{ display:inline-block; max-width:94%; font-family:${nameFontFamily}; font-size:${nameFontSize}; font-weight:${nameFontWeight}; font-style:${nameFontStyle}; letter-spacing:${nameLetterSpacing}; color:${NAVY}; line-height:1.15; margin-top:2px; padding:0 8px; }
  .rule{ width:300px; height:1.5px; margin:4px auto 0; background:linear-gradient(90deg,transparent,${GOLD} 20%,${GOLD} 80%,transparent); }
  .text{ text-wrap:balance; font-size:14px; font-weight:500; color:${INK}; line-height:1.75; max-width:760px; margin:14px auto 0; }
  .text strong{ color:${NAVY}; font-weight:700; white-space:nowrap; }
  .sub{ font-family:'Cormorant Garamond',serif; font-style:italic; font-size:14.5px; color:#6b7280; margin-top:6px; }

  .facts{ display:flex; justify-content:center; width:100%; max-width:860px; border-top:1px solid #e3d6ad; border-bottom:1px solid #e3d6ad; padding:9px 0; }
  .facts .f{ flex:1; white-space:nowrap; padding:0 14px; border-left:1px solid #eadfbd; }
  .facts .f:first-child{ border-left:0; }
  .facts .f.w{ flex:1.6; }
  .facts .k{ font-size:6.8px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#8A6A1C; }
  .facts .v{ font-size:10.5px; font-weight:700; color:${NAVY}; margin-top:3px; }

  .base{ margin-top:10px; width:100%; display:grid; grid-template-columns:1fr auto 1fr; align-items:end; }
  .col-l{ display:flex; align-items:flex-end; gap:12px; text-align:left; }
  .qr{ width:70px; height:70px; padding:4px; background:#fff; border:1px solid ${GOLD}; }
  .ver .k{ font-size:7px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:${NAVY}; }
  .ver .v{ font-size:7.6px; color:#6b7280; line-height:1.5; margin-top:3px; }
  .col-c{ display:flex; justify-content:center; padding:0 30px; margin-bottom:0; }
  .col-r{ display:flex; justify-content:flex-end; }
  .sig{ position:relative; width:236px; text-align:center; }
  .sig .img{ height:46px; display:flex; align-items:flex-end; justify-content:center; }
  .sig .img img{ height:44px; object-fit:contain; }
  .sig .stamp{ position:absolute; right:-38px; bottom:6px; width:96px; height:96px; object-fit:contain; transform:rotate(-8deg); opacity:.88; mix-blend-mode:multiply; }
  .sig .ln{ height:1px; background:${NAVY}; margin:4px 0 5px; opacity:.5; }
  .sig .n{ font-size:10.5px; font-weight:700; letter-spacing:.9px; text-transform:uppercase; color:${NAVY}; }
  .sig .r{ font-size:8.4px; color:#555; margin-top:2px; font-weight:500; }

  .foot{ margin-top:10px; font-size:7.4px; color:#7b8290; line-height:1.5; }
  .foot b{ color:${NAVY}; font-weight:700; }
  .foot a, .ver a{ color:inherit; text-decoration:none; }

  @media print{
    html,body{ width:297mm; height:210mm; background:#fff; padding:0; margin:0; display:block; }
    .cert-paper{ box-shadow:none; margin:0; transform:none !important; }
    .no-print{ display:none !important; }
  }
  .print-btn{ position:fixed; top:16px; right:16px; padding:10px 22px; background:${NAVY}; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:800; cursor:pointer; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,.3); }
  .print-btn:hover{ background:${B.colorLight}; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">PRINT / SAVE PDF</button>

<div class="cert-paper">
  <div class="watermark"></div>
  <div class="frame1"></div><div class="frame2"></div>
  ${guilloche(false)}${guilloche(true)}
  <div class="micro t">${micro}</div><div class="micro b">${micro}</div>

  <div class="content">
    <div class="head">
      <img src="${B.logo}" alt="${B.name} logo"/>
      <div class="hr">
        ${B.logoHasName ? '' : `<div class="org">${B.legal}</div>`}
        ${B.tagline ? `<div class="tag">${B.tagline}</div>` : ''}
        ${B.venture ? `<div class="vent">${B.venture.name}<br/><span>A venture of ${B.legal}</span></div>` : ''}
      </div>
    </div>

    <div class="title">
      <h1>Certificate</h1>
      <div class="of"><i></i><b>of ${esc(t.of)}</b><i></i></div>
    </div>

    <div class="mid">
      <p class="certify">This is to certify that</p>
      <h2 class="name">${esc(holderName)}</h2>
      <div class="rule"></div>
      <p class="text">${bodyText}${holderInstitution ? ` (${esc(holderInstitution)}${holderDepartment ? ', '+esc(holderDepartment) : ''})` : ''}</p>
      <p class="sub">in recognition of their dedication, commitment and valuable contributions.</p>
    </div>

    <div class="facts">${factsHTML}</div>

    <div class="base">
      <div class="col-l">
        <img class="qr" src="${qrCodeUrl}" alt="Verification QR code"/>
        <div class="ver">
          <div class="k">Verified credential</div>
          <div class="v">Scan to confirm authenticity<br/><a href="${VERIFY_ORIGIN}" style="color:inherit">verify.waveseed.app</a>${refNum ? `<br/>Ref ${esc(refNum)}` : ''}</div>
        </div>
      </div>
      <div class="col-c">${sealHTML}</div>
      <div class="col-r">
        <div class="sig">
          ${B.seal ? `<img class="stamp" src="${B.seal}" alt="Company stamp"/>` : ''}
          <div class="img">${B.sigImage ? `<img src="${B.sigImage}" alt="Signature"/>` : ''}</div>
          <div class="ln"></div>
          <div class="n">${B.sigName}</div>
          <div class="r">${B.sigTitle}, ${B.legal}</div>
        </div>
      </div>
    </div>

    <div class="foot"><b>${siteLink()}</b> &nbsp;·&nbsp; ${mailLink()}${addrLine ? ` &nbsp;·&nbsp; ${esc(addrLine)}` : ''}</div>
  </div>
</div>
</body>
</html>`;
}

// ─── Letter frame ─────────────────────────────────────────────────────────────
// Standard business-letter layout: letterhead of the PARENT company (with the venture as a
// sub-head), reference/date block, body, signature, enclosures, verification, and a running
// footer with "Page x of y" on every printed A4 page.
const plain = s => String(s == null ? '' : s).replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const VERIFY_ORIGIN = 'https://verify.waveseed.app';
const aHref = (href, text) => `<a href="${href}">${text}</a>`;
const mailLink = () => B.email ? `<a href="mailto:${B.email}">${B.email}</a>` : '';
const siteLink = () => B.website ? `<a href="${B.siteUrl}">${B.website}</a>` : '';
const verifyLink = (path = '') => aHref(VERIFY_ORIGIN + (path ? '/' + path : ''), 'verify.waveseed.app' + (path ? '/' + path : ''));
const acceptUrl = (ref) => VERIFY_ORIGIN + '/#accept' + (ref ? '?ref=' + encodeURIComponent(ref) : '');
const cssStr = s => plain(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');

function letterheadHTML() {
  const contact = [
    B.address,
    B.phone && `Tel: ${B.phone}`,
    mailLink(),
    siteLink(),
    B.reg && `CIN: ${B.reg}`,
  ].filter(Boolean).join('<br/>');
  const v = B.venture;
  return `
<header class="lh">
  <div class="lh-brand">
    <img src="${B.logo}" alt="${B.name} logo"/>
    <div class="lh-text">${B.logoHasName ? '' : `<div class="lh-name">${B.name}</div>`}${B.tagline ? `<div class="lh-tag">${B.tagline}</div>` : ''}</div>
  </div>
  <div class="lh-contact">${contact}</div>
</header>
<div class="lh-rule"></div>
${v ? `<div class="venture">${v.logo ? `<img src="${v.logo}" alt=""/>` : ''}<span><b>${v.name}</b> &nbsp;A venture of ${B.legal}</span>${v.tagline ? `<em>${v.tagline}</em>` : ''}</div>` : ''}`;
}

// Free-text extra terms/notes from the form: one point per line. Printed once per document.
let EXTRA = '', EXTRA_USED = false;
function extraBlock(heading) {
  if (EXTRA_USED || !EXTRA.trim()) return '';
  EXTRA_USED = true;
  const lines = EXTRA.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  const body = lines.length === 1 ? `<p class="para">${esc(lines[0])}</p>` : `<ul class="bullet-list">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
  return `<div class="section-title">${heading}</div>\n${body}`;
}

export function signatureBlockHTML() {
  return `
${extraBlock('Additional Notes')}
<div class="sign">
  <p class="sign-close">Yours sincerely,</p>
  <p class="sign-for">For <b>${B.legal}</b></p>
  <div class="sign-area">
    ${B.sigImage ? `<img class="sign-img" src="${B.sigImage}" alt="Signature"/>` : ''}
    ${B.seal ? `<img class="sign-seal" src="${B.seal}" alt="Company seal"/>` : ''}
  </div>
  <div class="sign-name">${B.sigName}</div>
  <div class="sign-title">${B.sigTitle}</div>
  <div class="sign-auth">Authorised Signatory</div>
</div>`;
}

function letterWrapper({ title, refNum='', date='', body='', confidential=true, verificationId='', docType='', enclosures='' }) {
  const dateHTML = /^\d{4}-\d{2}-\d{2}$/.test(date) ? fmtDate(date) : (esc(date) || today());
  const footLeft = cssStr(`${B.name}${verificationId ? '  ·  ' + verificationId : ''}`);
  const verifyUrl = `https://verify.waveseed.app/?id=${encodeURIComponent(verificationId)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} — ${B.name}</title>
<link href="${GF}" rel="stylesheet"/>
<style>
  /* A4 page: margins come from @page so every printed page is framed the same way */
  @page {
    size: A4 portrait; margin: 16mm 18mm 20mm 18mm;
    @bottom-left  { content: "${footLeft}"; font: 7.5pt 'Inter', Arial, sans-serif; color: #7a849c; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt 'Inter', Arial, sans-serif; color: #7a849c; }
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  :root{ --navy:${B.color}; --ink:#1b2437; --muted:#5b667f; --rule:#cfd6e4; --gold:#c9a227; }
  html{ background:#e8ecf4; }
  body{ width:210mm; min-height:297mm; margin:24px auto; padding:16mm 18mm 18mm; background:#fff; color:var(--ink);
        font:10.5pt/1.62 'Inter', Arial, sans-serif; position:relative; box-shadow:0 8px 34px rgba(10,20,48,.20);
        -webkit-print-color-adjust:exact; print-color-adjust:exact; hyphens:auto; }

  /* Letterhead (first page) */
  .lh{ display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:10px; }
  .lh-brand{ display:flex; align-items:center; gap:12px; min-width:0; }
  .lh-brand img{ height:84px; max-width:190px; object-fit:contain; flex:none; margin:-8px 0 -6px -6px; }
  .lh-text{ border-left:1.5px solid #c9a227; padding-left:14px; }
  .lh-name{ font:700 18pt/1.1 'Playfair Display', Georgia, serif; color:var(--navy); letter-spacing:.2px; }
  .lh-tag{ margin-top:3px; font-size:7pt; letter-spacing:.14em; text-transform:uppercase; color:#8a6d12; font-weight:600; }
  .lh-contact{ text-align:right; font-size:7.8pt; line-height:1.6; color:var(--muted); }
  .lh-rule{ position:relative; height:2px; background:var(--navy); margin-bottom:10px; }
  .lh-rule::after{ content:''; position:absolute; left:0; right:0; bottom:-4px; height:1px; background:linear-gradient(90deg,#c9a227,#ecd27a,#c9a227); }
  .venture{ display:flex; align-items:center; gap:10px; margin:8px 0 0; padding:6px 12px; border-left:3px solid var(--gold); background:#faf6e8; font-size:8.5pt; color:#3b4560; }
  .venture img{ height:20px; }
  .venture b{ color:var(--navy); letter-spacing:.12em; text-transform:uppercase; font-weight:700; }
  .venture em{ margin-left:auto; font-style:normal; color:#7a6a2a; font-size:8pt; }

  /* Reference block */
  .meta{ display:flex; justify-content:space-between; gap:20px; margin:20px 0 14px; font-size:9.5pt; color:var(--ink); }
  .meta span{ color:var(--muted); font-size:8.5pt; display:inline-block; min-width:70px; }
  .meta-r{ text-align:right; }
  .meta-r span{ min-width:0; margin-right:10px; }
  .confidential{ font-size:7.5pt; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:#b42318; margin-bottom:14px; }

  /* Letter body */
  .recipient-block{ margin-bottom:16px; line-height:1.55; }
  .subject-line{ margin:0 0 14px; }
  .subject-label{ font-weight:700; color:var(--navy); }
  .subject-text{ font-weight:700; color:var(--navy); text-decoration:underline; text-underline-offset:2px; text-transform:uppercase; letter-spacing:.02em; }
  .salutation{ margin-bottom:10px; font-weight:600; }
  .para{ margin-bottom:10px; text-align:justify; orphans:3; widows:3; }
  .section-title{ break-after:avoid; margin:16px 0 8px; padding-bottom:3px; border-bottom:1.5px solid var(--gold); display:inline-block; font-size:9pt; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--navy); }
  .highlight-table{ width:100%; border-collapse:collapse; margin:8px 0 14px; font-size:10pt; border:1px solid var(--rule); break-inside:avoid; }
  .highlight-table th{ background:var(--navy); color:#fff; padding:7px 12px; text-align:left; font-size:8.5pt; letter-spacing:.08em; text-transform:uppercase; }
  .highlight-table td{ padding:6px 12px; border:1px solid var(--rule); vertical-align:top; }
  .highlight-table td:first-child{ width:32%; background:#f5f7fb; font-weight:600; color:var(--navy); }
  .bullet-list{ list-style:none; margin:0 0 12px; }
  .bullet-list li{ position:relative; padding-left:16px; margin-bottom:4px; orphans:2; widows:2; }
  .bullet-list li::before{ content:'›'; position:absolute; left:2px; color:var(--gold); font-weight:700; }

  /* Annexure (terms) — starts on its own page when printed */
  .annex{ margin-top:34px; padding-top:18px; border-top:1px dashed var(--rule); }
  .annex-title{ font-size:10pt; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--navy); margin:0 0 8px; padding-bottom:4px; border-bottom:1.5px solid var(--gold); display:inline-block; break-after:avoid; }
  .annex-p{ font-size:9.5pt; color:var(--muted); margin-bottom:10px; text-align:justify; }
  .terms-list{ padding-left:20px; margin:0 0 18px; font-size:9.5pt; line-height:1.55; color:#243049; }
  .terms-list li{ margin-bottom:5px; text-align:justify; break-inside:avoid-page; orphans:2; widows:2; }
  .accept{ margin-top:14px; padding:12px 14px; border:1px solid var(--rule); border-radius:4px; break-inside:avoid; }
  .accept-sign{ margin-top:22px; display:flex; justify-content:flex-end; break-inside:avoid; }
  .accept-sign > div{ min-width:230px; }
  .accept-label{ font-size:8.5pt; color:var(--muted); margin-bottom:26px; }
  .accept-line{ border-top:1px solid #333; padding-top:4px; font-size:8.5pt; color:#333; }

  /* Signature */
  .sign{ margin-top:22px; break-inside:avoid; }
  .sign-close{ margin-bottom:2px; }
  .sign-for{ margin-bottom:0; }
  .sign-area{ position:relative; height:62px; margin:2px 0; }
  .sign-img{ position:absolute; left:0; top:6px; height:46px; max-width:150px; object-fit:contain; mix-blend-mode:multiply; }
  .sign-seal{ position:absolute; left:130px; top:-6px; height:74px; width:74px; object-fit:contain; opacity:.92; transform:rotate(-8deg); }
  .sign-name{ font-weight:700; color:var(--navy); }
  .sign-title{ font-size:9.5pt; color:var(--ink); }
  .sign-auth{ font-size:8.5pt; color:var(--muted); }
  .encl{ margin-top:14px; font-size:9pt; color:var(--muted); }

  /* Verification + footer */
  .verify{ display:flex; align-items:center; gap:12px; margin-top:20px; padding:8px 12px; border:1px solid var(--rule); border-radius:6px; width:fit-content; break-inside:avoid; background:#fbfcfe; }
  .verify img{ height:54px; width:54px; }
  .verify b{ display:block; font-size:8pt; letter-spacing:.1em; text-transform:uppercase; color:var(--navy); }
  .verify code{ display:block; font:600 8.5pt ui-monospace, Consolas, monospace; color:#8a6d12; margin:1px 0; }
  .verify small{ font-size:7.5pt; color:var(--muted); }
  .foot{ margin-top:26px; padding-top:8px; border-top:1px solid var(--rule); font-size:7.5pt; color:var(--muted); display:flex; justify-content:space-between; gap:16px; }

  a{ color:inherit; text-decoration:underline; text-decoration-color:#c9a227; text-underline-offset:2px; }
  .lh-contact a{ text-decoration:none; }
  .print-btn{ position:fixed; top:16px; right:16px; padding:10px 22px; background:var(--navy); color:#fff; border:0; border-radius:8px; font:700 13px 'Inter',sans-serif; cursor:pointer; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,.25); }

  @media print{
    html{ background:none; }
    body{ width:auto; min-height:0; margin:0; padding:0; box-shadow:none; }
    .no-print{ display:none!important; }
    .annex{ break-before:page; border-top:0; margin-top:0; padding-top:0; }
    .foot{ display:none; }
  }
</style>
</head>
<body class="${docType}">
<button class="print-btn no-print" onclick="window.print()">PRINT / SAVE PDF</button>
${letterheadHTML()}
<div class="meta">
  <div>
    ${refNum ? `<div><span>Ref. No.</span>${esc(refNum)}</div>` : ''}
    ${EMP_CODE ? `<div><span>ID</span>${EMP_CODE}</div>` : ''}
  </div>
  <div class="meta-r">
    <div><span>Date</span>${dateHTML}</div>
    ${verificationId ? `<div><span>Document ID</span>${esc(verificationId)}</div>` : ''}
  </div>
</div>
${confidential ? '<div class="confidential">Private &amp; Confidential</div>' : ''}
${/To Whomsoever/i.test(body) ? body.replace('Yours sincerely,', 'Yours faithfully,') : body}
${enclosures ? `<div class="encl"><b>Enclosures:</b> ${esc(enclosures)}</div>` : ''}
${verificationId ? `
<div class="verify">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}" alt="Verification QR code"/>
  <div><b>Verify this document</b><code>${esc(verificationId)}</code><small>Scan the code or visit verify.waveseed.app</small></div>
</div>` : ''}
<div class="foot">
  <span>${B.legal}${B.address ? ' &nbsp;·&nbsp; ' + B.address.replace(/<br\/>/g, ', ') : ''}</span>
  <span>${B.reg ? 'CIN: ' + B.reg + ' &nbsp;·&nbsp; ' : ''}<a href="${B.siteUrl}" style="color:inherit">${B.website}</a></span>
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. INTERNSHIP OFFER LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function internshipOfferTemplate(data) {
  const {
    refNum='', date='', recipientName='', recipientCollege='', recipientDept='',
    recipientEmail='', role='', product=(B.code === 'WS' ? 'WaveBase AI' : ''), reportingTo=(B.code === 'WS' ? `Chief Developer, ${B.legal}` : ''),
    startDate='', endDate='', duration='2 Months', workHours='4–5 Hours per Day',
    workMode='Remote (Work From Home)', stipend='Unpaid Internship',
    probation='15 days', noticePeriod='15 days', responsibilities='', workLocation='', offerValidity='',
    certId='',
  } = data;

  // Responsibilities: custom list (one per line) if given; otherwise a default that suits the business.
  const mentorRef = reportingTo ? `your mentor, ${esc(reportingTo)},` : 'your mentor';
  const customResp = String(responsibilities || '').split('\n').map(s => s.trim()).filter(Boolean);
  const respItems = customResp.length ? customResp.map(esc) : (B.code === 'WS' ? [
    `Collaborating with ${mentorRef} to design, build, and iterate on features for the ${esc(product) || 'company'} platform.`,
    'Writing clean, efficient, and well-documented front-end and back-end code.',
    'Integrating AI/ML capabilities into the platform in alignment with product requirements.',
    'Participating in technical design discussions, code reviews, and sprint planning.',
    'Conducting research and prototyping new AI-driven features as directed.',
    'Testing, debugging, and optimizing code for production readiness.',
    'Communicating progress, blockers, and ideas proactively to your mentor.',
  ] : [
    `Carrying out the tasks and projects assigned to you in your role as ${esc(role)}.`,
    `Collaborating with ${mentorRef} and the wider team.`,
    'Preparing clear updates, reports, or deliverables as required.',
    'Participating in team meetings, planning sessions, and reviews.',
    'Researching, learning, and applying new skills relevant to your role.',
    'Communicating progress, blockers, and ideas proactively to your mentor.',
  ]);
  const respHTML = respItems.map(r => `<li>${r}</li>`).join('\n  ');

  const body = `
<div class="recipient-block">
  <strong>${esc(recipientName)}</strong><br/>
  ${recipientCollege ? esc(recipientCollege)+'<br/>' : ''}
  ${recipientDept ? esc(recipientDept)+'<br/>' : ''}
  ${recipientEmail ? `Email: ${esc(recipientEmail)}` : ''}
</div>
<div class="subject-line">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Internship Offer Letter — ${esc(role)}${product ? ' | ' + esc(product) : ''}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">We are thrilled to extend this <strong>Internship Offer</strong> to you at <strong>${B.legal}</strong>, welcoming you as a <strong>${esc(role)}</strong>. At ${B.short}, we firmly believe our people are our greatest asset. We are highly selective in extending internship opportunities, and you have distinguished yourself as one of the best and brightest. We are confident you will play an integral role in shaping the future of ${(product && B.code === 'WS') ? `<strong>${esc(product)}</strong> — our flagship SaaS product —` : `<strong>${product ? esc(product) : B.short}</strong>,`} and we look forward to a productive, impactful, and enriching journey together.</p>

<div class="section-title">Internship at a Glance</div>
<table class="highlight-table">
  <tr><td>Role</td><td>${esc(role)}</td></tr>
  ${product ? `<tr><td>Product</td><td>${esc(product)}</td></tr>` : ''}
  ${reportingTo ? `<tr><td>Reporting To</td><td>${esc(reportingTo)}</td></tr>` : ''}
  <tr><td>Duration</td><td>${esc(duration)}${(startDate && endDate) ? ' ('+fmtDate(startDate)+' – '+fmtDate(endDate)+')' : ''}</td></tr>
  <tr><td>Start Date</td><td>${fmtDate(startDate)}</td></tr>
  <tr><td>Work Mode</td><td>${esc(workMode)}</td></tr>
  ${workLocation ? `<tr><td>Place of Work</td><td>${esc(workLocation)}</td></tr>` : ''}
  <tr><td>Working Hours</td><td>${esc(workHours)}</td></tr>
  <tr><td>Stipend</td><td>${esc(stipend)}</td></tr>
</table>

<div class="section-title">Role &amp; Responsibilities</div>
<ul class="bullet-list">
  ${respHTML}
</ul>

<div class="section-title">Standard Terms &amp; Conditions</div>
<ul class="bullet-list">
  <li><strong>Intellectual Property:</strong> All software, code, algorithms, designs, documents, and inventions developed during the internship belong exclusively to ${B.legalDot}</li>
  <li><strong>Non-Disclosure (NDA):</strong> You shall maintain strict confidentiality regarding all proprietary information, source code, designs, and company communications.</li>
  <li><strong>Termination:</strong> Either party may terminate the association by giving written notice of ${esc(noticePeriod)}. ${B.legal} reserves the right to terminate immediately for cause.</li>
</ul>

${extraBlock('Additional Terms &amp; Conditions')}
<div class="section-title">Accepting this Offer &amp; Joining Formalities</div>
<p class="para">${offerValidity ? `This offer is valid until <strong>${fmtDate(offerValidity)}</strong>. ` : ''}Please complete these steps in order:</p>
<ol class="terms-list" style="font-size:inherit;color:inherit;">
  <li><strong>Accept this offer.</strong> The quickest way is online at <strong>${aHref(acceptUrl(refNum), 'verify.waveseed.app/#accept')}</strong>. Sign in with your reference number and date of birth, read this letter and accept it with your electronic signature. If you prefer, sign the acknowledgement on the last page and upload the signed copy at the same link, or email it to <strong>${mailLink()}</strong>.</li>
  <li><strong>Upload your documents.</strong> Straight after you accept, you will be taken to the upload page for your government photo ID, passport-size photograph, college ID card, and your 10th and 12th marksheets. You can also upload them at any time at <strong>${aHref(VERIFY_ORIGIN + '/#upload', 'verify.waveseed.app/#upload')}</strong>, using your reference number and date of birth.</li>
  <li><strong>Complete your onboarding profile</strong> at <strong>${aHref(VERIFY_ORIGIN + '/#onboard/' + B.code.toLowerCase(), 'verify.waveseed.app/#onboard/' + B.code.toLowerCase())}</strong>.</li>
  <li>Keep the originals ready for verification, where required.</li>
</ol>
<p class="para">An electronic acceptance is recorded with its date and time, your IP address and device details, as explained in the Terms below.</p>

${signatureBlockHTML()}


<section class="annex">
  <h3 class="annex-title">TERMS AND CONDITIONS — ANNEXURE A</h3>
  <p class="annex-p">
    The following terms govern your internship with ${B.legal} (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list">
    <li>The roles, responsibilities, and duties appropriate to your designation will be specified by the Company from time to time and may be modified at its sole discretion. You may also be required to provide services to the Company's affiliates, contractors, and clients as necessary.</li>
    <li>The duration of the internship is ${esc(duration)}${workHours ? ` with ${esc(workHours)}` : ''}, ${(startDate && endDate) ? `commencing ${fmtDate(startDate)} and concluding ${fmtDate(endDate)}` : startDate ? `commencing ${fmtDate(startDate)}` : 'commencing on the start date confirmed by the Company'}. You are required to devote your time and efforts solely to ${B.legal} work during this period. Please inform your mentor in advance of any upcoming commitments so that work can be planned accordingly.</li>
    <li>Your work mode is: ${esc(workMode)}. Regular catch-up calls will be scheduled with ${reportingTo ? esc(reportingTo) : 'your mentor'} to review progress and your overall internship experience.</li>
    <li>You will be on probation for the first ${esc(probation)}. Confirmation of continued internship will be based on your mentor's assessment of your performance.</li>
    <li>All work produced during or in relation to ${B.legal} — including software, code, designs, documents, inventions, and any other materials, whether created alone or with others, during or outside working hours — shall be the exclusive intellectual property of ${B.legalDot} You hereby assign all such rights to the Company and waive any moral rights thereto. You are prohibited from storing, copying, selling, sharing, or distributing any such work to third parties, and from discussing your work publicly — online (blogs, social media) or offline — without prior written approval from your mentor.</li>
    <li>Data privacy and security are paramount. All student, customer, client, and company data accessed during your internship must be kept strictly confidential. ${B.legal} operates on a zero-tolerance policy toward any breach of data security. Upon completion of your internship, all Company data stored on your devices must be handed over to your mentor and permanently deleted from your systems.</li>
    <li>During the internship, you shall not directly or indirectly engage with any other organization (other than your college) in any capacity that conflicts with your commitments to the Company. Breach of this condition may result in immediate termination, and the Company may pursue any remedies available to it under applicable law.</li>
    <li>Either party may terminate this internship by giving written notice of ${esc(noticePeriod)}, without assigning any reason. The Company reserves the right to terminate immediately in cases of indiscipline, misconduct, data breach, or any violation of these terms.</li>
    <li>You are expected to conduct yourself with utmost professionalism in all interactions with your mentor, colleagues, clients, and customers.</li>
    <li>You shall receive continuous objective feedback from your mentor and are encouraged to seek and provide feedback at every opportunity. Constructive feedback is central to the ${B.short} culture.</li>
    <li>${/^\s*$|unpaid|^\s*(nil|none|no)\b/i.test(stipend) ? 'This is an unpaid internship.' : `You will receive a stipend of ${esc(stipend)}, subject to applicable tax and statutory deductions.`}</li>
    <li>A Certificate of Internship Completion will be issued upon successful completion of the internship period.</li>
    <li>Subject to your overall performance and at the management's discretion, you may receive a Letter of Recommendation.</li>
    <li>A Pre-Placement Offer (PPO) may be extended based on outstanding performance and management's discretion.</li>
    <li>${B.legal} may update its policies from time to time. Any material change to these terms will be communicated to you in writing.</li>
    <li>The tenure of the internship may be extended or reduced upon mutual consent of both the intern and ${B.legal} management.</li>
    <li>You shall at all times abide by ${B.legal}'s policies and code of conduct throughout your internship.</li>
    <li>You acknowledge that this offer is based on information provided by you. If any discrepancy is discovered, ${B.legal} reserves the right to terminate the internship immediately.</li>
    <li>You shall maintain strict confidentiality regarding all entities related to ${B.legal} during and after your internship. Upon termination or expiry, you shall update all professional and social profiles to reflect that you are no longer associated with the Company.</li>
    <li>You agree not to violate or attempt to violate the intellectual property rights of any third party during your internship.</li>
    <li>This internship is a learning engagement. It does not create an employer–employee relationship, and you are not entitled to employee benefits or any guarantee of future employment.</li>
    <li>On completion or termination of the internship, you shall promptly return all Company property, accounts, credentials, and access that were provided to you.</li>
    <li><strong>Electronic acceptance.</strong> This offer may be accepted electronically through the link given in this letter. An electronic acceptance, using your typed full name as your signature, is binding on you in the same way as a handwritten signature and is an agreement concluded by electronic means under the Information Technology Act, 2000. The Company records the date and time of the acceptance (from its own server), your IP address and your device and browser details, and, only if you choose to share it, your location, as evidence of the acceptance and to prevent fraud. The Company's record of the acceptance is conclusive evidence of it unless you prove otherwise.</li>
    <li>If any term of this offer is found to be unenforceable, the remaining terms continue in full force. The Company's failure or delay in enforcing a term is not a waiver of it.</li>
    <li>These Terms of Internship shall be governed by and construed in accordance with the Laws of India, and the courts at the place of the Company's registered office shall have exclusive jurisdiction over any dispute arising from them. This offer letter, together with Annexure A, constitutes the entire agreement between the parties and supersedes all prior discussions and representations.</li>
  </ol>

  <h3 class="annex-title">ACKNOWLEDGEMENT</h3>
  <p class="annex-p">
    I, <strong>${esc(recipientName)}</strong>, confirm that I have read, understood, and agree to all the terms and conditions contained in this Internship Offer Letter and Annexure A. I accept this offer and commit to fulfilling my responsibilities with dedication, professionalism, and integrity.
  </p>

  <div class="accept-sign"><div><div class="accept-label">Signature of Intern</div><div class="accept-line">Date: ______________ &nbsp;&nbsp; Place: ______________</div></div></div>
</section>`;

  return letterWrapper({ title:`Internship Offer Letter — ${recipientName}`, refNum, date, body, verificationId: certId, docType: 'internship-offer' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EMPLOYMENT OFFER LETTER (Full-time)
// ═══════════════════════════════════════════════════════════════════════════════
export function employmentOfferTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', department='',
    reportingTo='', joiningDate='', workMode='', ctc='',
    probation='3 Months', noticePeriod='60 days', noticeProbation='30 days', workLocation='', offerValidity='',
    certId='',
  } = data;

  const body = `
<div class="recipient-block"><strong>${esc(recipientName)}</strong></div>
<div class="subject-line">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Employment Offer Letter — ${esc(role)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">We are pleased to offer you the position of <strong>${esc(role)}</strong> at <strong>${B.legalDot}</strong> Following our interview process, we are confident that your skills and experience will be a great addition to our team. We look forward to you joining us and contributing to the journey of <strong>${B.name}</strong>.</p>

<div class="section-title">Offer at a Glance</div>
<table class="highlight-table">
  <tr><td>Designation</td><td>${esc(role)}</td></tr>
  ${department ? `<tr><td>Department</td><td>${esc(department)}</td></tr>` : ''}
  ${reportingTo ? `<tr><td>Reporting To</td><td>${esc(reportingTo)}</td></tr>` : ''}
  ${joiningDate ? `<tr><td>Date of Joining</td><td>${fmtDate(joiningDate)}</td></tr>` : ''}
  ${workMode ? `<tr><td>Work Mode</td><td>${esc(workMode)}</td></tr>` : ''}
  ${workLocation ? `<tr><td>Place of Work</td><td>${esc(workLocation)}</td></tr>` : ''}
  ${ctc ? `<tr><td>Compensation (CTC)</td><td>${esc(ctc)}</td></tr>` : ''}
  <tr><td>Probation Period</td><td>${esc(probation)}</td></tr>
</table>

<div class="section-title">Standard Terms &amp; Conditions</div>
<ul class="bullet-list">
  <li><strong>Probation:</strong> A probation period of ${esc(probation)} during which performance will be evaluated. Notice during probation is ${esc(noticeProbation)}.</li>
  <li><strong>Intellectual Property Assignment:</strong> All intellectual property, code, patents, and work products created during your employment belong exclusively to ${B.legalDot}</li>
  <li><strong>Confidentiality &amp; NDA:</strong> Strict compliance with non-disclosure of proprietary systems, client information, and internal processes.</li>
  <li><strong>Termination notice:</strong> Post-confirmation, the notice period required by either party shall be ${esc(noticePeriod)} in writing.</li>
</ul>

${extraBlock('Additional Terms &amp; Conditions')}
<div class="section-title">Accepting this Offer &amp; Joining Formalities</div>
<p class="para">${offerValidity ? `This offer is valid until <strong>${fmtDate(offerValidity)}</strong>. ` : ''}Please complete these steps in order:</p>
<ol class="terms-list" style="font-size:inherit;color:inherit;">
  <li><strong>Accept this offer.</strong> The quickest way is online at <strong>${aHref(acceptUrl(refNum), 'verify.waveseed.app/#accept')}</strong>. Sign in with your reference number and date of birth, read this letter and accept it with your electronic signature. If you prefer, sign the acknowledgement on the last page and upload the signed copy at the same link, or email it to <strong>${mailLink()}</strong>.</li>
  <li><strong>Upload your documents.</strong> Straight after you accept, you will be taken to the upload page for your government photo ID, PAN, passport-size photograph, 10th and 12th marksheets, highest qualification certificate and any previous experience letters. You can also upload them at any time at <strong>${aHref(VERIFY_ORIGIN + '/#upload', 'verify.waveseed.app/#upload')}</strong>, using your reference number and date of birth.</li>
  <li><strong>Complete your onboarding profile</strong> at <strong>${aHref(VERIFY_ORIGIN + '/#onboard/' + B.code.toLowerCase(), 'verify.waveseed.app/#onboard/' + B.code.toLowerCase())}</strong>.</li>
  <li>Bring the originals for verification on your date of joining.</li>
</ol>
<p class="para">An electronic acceptance is recorded with its date and time, your IP address and device details, as explained in the Terms below.</p>

${signatureBlockHTML()}


<section class="annex">
  <h3 class="annex-title">TERMS AND CONDITIONS — ANNEXURE A</h3>
  <p class="annex-p">
    The following terms govern your employment with ${B.legal} (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list">
    <li>The roles, responsibilities, and duties appropriate to your designation will be specified by the Company from time to time and may be modified at its sole discretion. You may also be required to provide services to the Company's affiliates, contractors, and clients as necessary.</li>
    <li>The duration of your employment is permanent and indefinite, commencing ${joiningDate ? fmtDate(joiningDate) : 'upon joining'}, subject to successful completion of the probation period. You are required to devote your full time, attention, and efforts solely to the business of ${B.legal} during this association.</li>
    <li>You may work remotely or from the office as specified in your offer details. Regular catch-up calls and status syncs will be scheduled to review progress and performance.</li>
    <li>You will be on probation for a period of ${esc(probation)}. Confirmation of employment is based on the management's assessment of your performance and conduct during probation.</li>
    <li>All work produced during or in relation to ${B.legal} — including software, code, designs, algorithms, documentation, inventions, and any other materials, whether created alone or with others, during or outside working hours — shall be the exclusive intellectual property of ${B.legalDot} You hereby assign all such rights to the Company. You are prohibited from storing, copying, selling, sharing, or distributing any such work to third parties.</li>
    <li>Data privacy and security are paramount. All customer, client, user, and company data accessed during your employment must be kept strictly confidential. ${B.legal} operates on a zero-tolerance policy toward any breach of data security.</li>
    <li>During your employment, you shall not directly or indirectly engage with any other organization or business in any capacity (including freelance, advisory, or part-time work) without prior written permission from the Company.</li>
    <li>Post-confirmation, either party may terminate employment by giving written notice of ${esc(noticePeriod)} (or ${esc(noticeProbation)} during probation), without assigning any reason. The Company reserves the right to terminate immediately for cause, misconduct, or data breach.</li>
    <li>You are expected to conduct yourself with utmost professionalism in all interactions with colleagues, mentors, clients, and customers.</li>
    <li>You shall receive continuous feedback from your reporting manager and are encouraged to seek and provide constructive feedback to foster a transparent growth environment.</li>
    <li>You shall receive compensation (CTC) as specified in your offer letter, subject to standard tax and statutory deductions in accordance with local regulations.</li>
    <li>Your performance and package will be reviewed annually in accordance with Company policies and discretionary management reviews.</li>
    <li>Leave allocation, holidays, working hours, and standard employee benefits shall be governed by the ${B.legal} Employee Handbook.</li>
    <li>The Company may provide performance bonuses or incentives based on company discretion and outstanding individual contributions.</li>
    <li>${B.legal} may update its policies from time to time. Any material change to these terms will be communicated to you in writing.</li>
    <li>Any modification or amendment to your roles, package, designation, or terms must be in writing and signed by both parties.</li>
    <li>You shall at all times abide by ${B.legal}'s policies and code of conduct throughout your employment.</li>
    <li>You acknowledge that this offer is based on information provided by you. If any discrepancy is discovered, ${B.legal} reserves the right to terminate the employment immediately.</li>
    <li>You shall maintain strict confidentiality regarding all entities related to ${B.legal} during and after your employment. Upon termination, you shall update all professional and social profiles to reflect that you are no longer associated with the Company.</li>
    <li>You agree not to violate or attempt to violate the intellectual property rights of any third party during your employment.</li>
    <li>On separation, you shall promptly return all Company property, accounts, credentials, and access that were provided to you, and complete a proper handover of your work.</li>
    <li><strong>Electronic acceptance.</strong> This offer may be accepted electronically through the link given in this letter. An electronic acceptance, using your typed full name as your signature, is binding on you in the same way as a handwritten signature and is an agreement concluded by electronic means under the Information Technology Act, 2000. The Company records the date and time of the acceptance (from its own server), your IP address and your device and browser details, and, only if you choose to share it, your location, as evidence of the acceptance and to prevent fraud. The Company's record of the acceptance is conclusive evidence of it unless you prove otherwise.</li>
    <li>If any term of this offer is found to be unenforceable, the remaining terms continue in full force. The Company's failure or delay in enforcing a term is not a waiver of it.</li>
    <li>These Terms of Employment shall be governed by and construed in accordance with the Laws of India, and the courts at the place of the Company's registered office shall have exclusive jurisdiction over any dispute arising from them. This offer letter, together with Annexure A, constitutes the entire agreement between the parties.</li>
  </ol>

  <h3 class="annex-title">ACKNOWLEDGEMENT</h3>
  <p class="annex-p">
    I, <strong>${esc(recipientName)}</strong>, confirm that I have read, understood, and agree to all the terms and conditions contained in this Employment Offer Letter and Annexure A. I accept this offer and commit to fulfilling my responsibilities with dedication, professionalism, and integrity.
  </p>

  <div class="accept-sign"><div><div class="accept-label">Signature of Employee</div><div class="accept-line">Date: ______________ &nbsp;&nbsp; Place: ______________</div></div></div>
</section>`;

  return letterWrapper({ title:`Employment Offer — ${recipientName}`, refNum, date, body, verificationId: certId, docType: 'employment-offer' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EXPERIENCE / SERVICE LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function experienceLetterTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', startDate='', endDate='',
    responsibilities='', conduct='satisfactory', letterPurpose='',
    certId='',
  } = data;
  const name = esc(recipientName);
  const pc = purposeClause(letterPurpose, isOngoing(data));
  const purposeHTML = esc(pc.lead) + (pc.value ? `<strong>${esc(pc.value)}</strong>` : '');

  // Current employee: no end date — state the tenure "since <start>" as on the letter date,
  // keep everything in present tense, and make clear this is not a relieving letter.
  if (isOngoing(data)) {
    const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Experience / Service Certificate — ${name}</span>
</div>
<p class="salutation">To Whomsoever It May Concern,</p>
<p class="para">This is to certify that <strong>${name}</strong> has been associated with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong> since <strong>${fmtDate(startDate)}</strong> and continues to be associated with the organisation in the same capacity as on the date of this letter, <strong>${fmtDate(date)}</strong>. Throughout their tenure of service, they have demonstrated high diligence, competence, and professional responsibility.</p>

<p class="para">During their association with ${B.legal}, ${name} has made valuable contributions to the organisation and carried out the responsibilities of their role with diligence and a strong sense of ownership. Their dedication, willingness to learn, and ability to collaborate across teams is exemplary.</p>

${responsibilities ? `<p class="para"><strong>Core Responsibilities &amp; Areas of Focus:</strong> ${esc(responsibilities)}</p>` : `

`}

<p class="para">During their service with ${B.legal} to date, <strong>${name}</strong> has demonstrated <strong>${esc(conduct)}</strong> conduct, maintained a high level of integrity, and exhibited positive interpersonal relationships with peers and management.</p>

<p class="para">We appreciate their continued efforts, dedication, and contribution to the organization, and wish them continued success in their role and professional endeavours with us.</p>

<p class="para" style="margin-bottom:24px;">This certificate is issued upon their request ${purposeHTML}. It confirms their service up to the date of issue and does not constitute a relieving letter or a release from their current employment.${isEducationPurpose(letterPurpose) ? ` Any leave, sabbatical, or release from duties required to pursue the same shall be subject to the company's policies and separate written approval from ${B.legal}` : ''}</p>

${signatureBlockHTML()}`;
    return letterWrapper({ title:`Experience Letter — ${recipientName}`, refNum, date, body, verificationId: certId });
  }

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Experience / Service Certificate — ${esc(recipientName)}</span>
</div>
<p class="salutation">To Whomsoever It May Concern,</p>
<p class="para">This is to certify that <strong>${esc(recipientName)}</strong> was associated with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong>${(startDate && endDate) ? ` from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}. Throughout their tenure of service, they demonstrated high diligence, competence, and professional responsibility.</p>

<p class="para">During their association with ${B.legal}, ${esc(recipientName)} made valuable contributions to the organisation and carried out the responsibilities of their role with diligence and a strong sense of ownership. Their dedication, willingness to learn, and ability to collaborate across teams was exemplary.</p>

${responsibilities ? `<p class="para"><strong>Core Responsibilities &amp; Areas of Focus:</strong> ${esc(responsibilities)}</p>` : `

`}

<p class="para">During the tenure of their service with ${B.legal}, <strong>${esc(recipientName)}</strong> demonstrated <strong>${esc(conduct)}</strong> conduct, maintained a high level of integrity, and exhibited positive interpersonal relationships with peers and management. They completed all their designated handovers, documentation, and asset returns in accordance with company transition policies.</p>

<p class="para">We appreciate their valuable efforts, dedication, and contribution to the organization during their service period. On behalf of the management at ${B.legal}, we wish them the absolute best in all their future career steps and professional endeavours.</p>

<p class="para" style="margin-bottom:24px;">This certificate is issued upon their request ${purposeHTML}.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title:`Experience Letter — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RELIEVING LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function relievingLetterTemplate(data) {
  const { refNum='', date='', recipientName='', role='', relievingDate='', certId='' } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Relieving Letter — ${esc(recipientName)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">This is with reference to your resignation from the position of <strong>${esc(role)}</strong> at <strong>${B.legal}</strong>, which has been accepted. We confirm that you stand relieved from your duties and responsibilities with the company at the close of business hours on <strong>${fmtDate(relievingDate)}</strong>.</p>

<p class="para">We confirm that all exit formalities, full and final settlement of accounts, transition of key duties, and handover reports have been completed to the satisfaction of the management. All company assets, including hardware, intellectual property access, database keys, and email accounts in your possession, have been returned and deactivated as per the company's security policy.</p>

<p class="para">Please be reminded that your post-employment obligations, including confidentiality clauses, intellectual property rights covenants, and non-disclosure agreements signed during your onboarding, continue to remain in full force and effect. You are expected to respect and uphold these guidelines as you move forward.</p>

<p class="para">We sincerely appreciate the efforts, dedication, and service you rendered during your tenure with ${B.legalDot} We wish you great success in all your future professional pursuits and personal endeavors.</p>

<p class="para" style="margin-bottom:24px;">For any future verifications or reference checks, please refer to our registry database at <strong>${verifyLink()}</strong> using your Verification ID, or contact our HR department directly at <strong>${mailLink()}</strong>.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title:`Relieving Letter — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TERMINATION LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function terminationLetterTemplate(data) {
  const { refNum='', date='', recipientName='', role='', terminationDate='', reason='', finalSettlement='', certId='' } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Notice of Termination of Association</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">This letter serves as formal notification that your association with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong> stands terminated with effect from <strong>${fmtDate(terminationDate)}</strong>. From that date you will no longer be authorised to represent or perform any duties on behalf of ${B.legalDot}</p>

${reason ? `<p class="para"><strong>Grounds for termination:</strong> ${esc(reason)}</p>` : ''}

<p class="para">You are required to immediately return all Company-owned assets, including but not limited to laptops, access cards, key tokens, proprietary documents, codebases, and any other physical or digital property in your possession. Your access to all ${B.short} systems, communication channels, email accounts, and repository hosting services will be formally revoked as of the separation date.</p>

${finalSettlement ? `<p class="para"><strong>Final Settlement Terms:</strong> ${esc(finalSettlement)}</p>` : `
<p class="para">The finance team will process your full and final settlement, including any outstanding stipends, salary payouts, or expenses, within the standard corporate cycle, subject to a completed clearance certificate from your team lead.</p>
`}

<p class="para">Please remember that your post-separation obligations regarding intellectual property ownership, confidentiality, and non-disclosure remain fully binding. You must not disclose or use any proprietary data or code belonging to ${B.legal} at any point in the future.</p>

<p class="para" style="margin-bottom:24px;">Please acknowledge receipt of this letter by signing below. For queries related to clearance or settlement, you can contact the HR department at <strong>${mailLink()}</strong>.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title:`Termination Letter — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LETTER OF RECOMMENDATION (LOR)
// ═══════════════════════════════════════════════════════════════════════════════
export function lorTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', startDate='', endDate='',
    strengths='', achievements='', recommendation='',
    issuerName='Mahender', issuerTitle='Founder, ${B.legal}',
    certId='',
  } = data;

  const body = `
<p class="salutation" style="margin-bottom:16px;">To Whomsoever It May Concern,</p>
<p class="para">It is with great pleasure and without reservation that I write this Letter of Recommendation for <strong>${esc(recipientName)}</strong>, ${isOngoing(data) ? `who has been serving as a <strong>${esc(role)}</strong> at <strong>${B.legal}</strong> since <strong>${fmtDate(startDate)}</strong>` : `who served as a <strong>${esc(role)}</strong> at <strong>${B.legal}</strong>${(startDate && endDate) ? ` during the period from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}`}. Throughout their tenure with us, they have consistently demonstrated an outstanding work ethic, strong professionalism, and a proactive attitude toward solving problems.</p>

<p class="para">During their association with ${B.legal}, ${esc(recipientName)} contributed actively to the work of their team in the role of ${esc(role)}. They approached their responsibilities with ownership, took initiative, and consistently delivered work to a high standard, while collaborating well with colleagues and mentors.</p>

${strengths ? `<p class="para"><strong>Key Strengths &amp; Capabilities:</strong> ${esc(strengths)}</p>` : `
<p class="para">In terms of strengths, ${esc(recipientName)} shows strong analytical and problem-solving skills, learns quickly, and is self-driven when it comes to researching, planning, and carrying tasks through to completion.</p>
`}

${achievements ? `<p class="para"><strong>Notable Contributions &amp; Achievements:</strong> ${esc(achievements)}</p>` : `
<p class="para">Among their contributions, ${esc(recipientName)} completed their assigned responsibilities reliably and with attention to quality, which supported smooth delivery for the team and reflected well on the organisation.</p>
`}

${recommendation ? `<p class="para">${esc(recommendation)}</p>` : `
<p class="para">Beyond their professional skills, ${esc(recipientName)} is an excellent communicator and a reliable team player. They collaborate seamlessly with cross-functional team members, receive feedback constructively, and support peers. Their enthusiasm, professional maturity, and dedication make them stand out as a promising professional.</p>

<p class="para">I highly recommend <strong>${esc(recipientName)}</strong> for any role, academic endeavour, or project that requires intellectual curiosity, sound judgement, and dedication. I am confident they will bring the same excellence, energy, and value to your organization as they ${isOngoing(data) ? 'do' : 'did'} to ours. We wish them the absolute best in all their future professional pursuits.</p>
`}

<p class="para" style="margin-bottom:24px;">Please feel free to contact me at <strong>${mailLink()}</strong> if you require any additional information or verification regarding their tenure and contributions.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title:`LOR — ${recipientName}`, refNum, date, body, confidential:false, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. NO OBJECTION CERTIFICATE (NOC)
// ═══════════════════════════════════════════════════════════════════════════════
export function nocTemplate(data) {
  const { refNum='', date='', recipientName='', role='', purpose='', startDate='', endDate='', certId='' } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">No Objection Certificate (NOC)</span>
</div>
<p class="salutation">To Whomsoever It May Concern,</p>
<p class="para">This is to certify that <strong>${esc(recipientName)}</strong> ${isOngoing(data)
  ? `has been associated with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong> since <strong>${fmtDate(startDate)}</strong> and continues to be associated with the company as on <strong>${fmtDate(date)}</strong>`
  : `is${(startDate && endDate) ? `/was` : ''} associated with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong>${(startDate && endDate) ? ` during the period from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}`}. Throughout their tenure with the company, they have maintained a clean record of service and adhered to all corporate codes of conduct.</p>

<p class="para">During their association, ${esc(recipientName)} has been an integral part of our team. They have consistently demonstrated professional discipline, integrity, and dedication in executing their responsibilities. All their projects and handovers have been documented and handled with high standard compliance.</p>

${purpose ? `<p class="para">This No Objection Certificate is issued specifically to assist them in: <strong>${esc(purpose)}</strong>.</p>` : `
<p class="para">This No Objection Certificate is being issued upon their request to facilitate their application for higher studies, external employment opportunities, passport/visa documentation, or other formal verification procedures.</p>
`}

<p class="para">${B.legal} confirms that there are no outstanding dues, liabilities, or conflicts of interest associated with ${esc(recipientName)}. We have <strong>no objection</strong> to them pursuing any of the aforementioned activities, career advancements, or academic applications. We support their aspirations and believe they will continue to excel in their future goals.</p>

<p class="para" style="margin-bottom:24px;">For any additional queries or formal verification of this document, feel free to visit <strong>${verifyLink()}</strong> or reach out to our human resources team at <strong>${mailLink()}</strong>.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title:`NOC — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PROMOTION LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function promotionLetterTemplate(data) {
  const {
    refNum='', date='', recipientName='', oldRole='', newRole='',
    effectiveDate='', newCtc='', reportingTo='',
    issuerName='Mahender', issuerTitle='Founder, ${B.legal}',
    certId='',
  } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Promotion Letter — ${esc(recipientName)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">On behalf of the management at <strong>${B.legal}</strong>, it gives us immense pleasure to inform you that, in recognition of your exemplary performance, high dedication, leadership capabilities, and valuable contributions, you have been <strong>promoted</strong> to the position of <strong>${esc(newRole)}</strong>.</p>

<p class="para">In your new capacity, you will take on broader responsibilities that are critical to the growth and execution of our technology products and operational deliverables. We are confident that you will bring the same dedication, technical insight, and initiative to this role that you have displayed throughout your tenure with us.</p>

<div class="section-title">Promotion Details</div>
<table class="highlight-table">
  ${oldRole ? `<tr><td>Previous Designation</td><td>${esc(oldRole)}</td></tr>` : ''}
  <tr><td>New Designation</td><td><strong>${esc(newRole)}</strong></td></tr>
  ${effectiveDate ? `<tr><td>Effective Date</td><td>${fmtDate(effectiveDate)}</td></tr>` : ''}
  ${reportingTo ? `<tr><td>Reporting Manager</td><td>${esc(reportingTo)}</td></tr>` : ''}
  ${newCtc ? `<tr><td>Revised Compensation (CTC)</td><td><strong>${esc(newCtc)}</strong></td></tr>` : ''}
</table>

<p class="para">Your revised compensation and benefits will take effect from the date mentioned above. A separate detailed addendum outlining your specific key performance indicators (KPIs) and functional expectations will be shared with you by your reporting manager shortly.</p>

<p class="para">We congratulate you on this well-deserved milestone. Your growth within ${B.legal} reflects our confidence in your talents and our commitment to nurturing internal leadership. We look forward to seeing you excel and drive positive changes in this new role.</p>

<p class="para" style="margin-bottom:24px;">Please sign and return the duplicate copy of this letter as token acceptance of your promotion terms and new responsibilities.</p>

${signatureBlockHTML()}

<div style="margin-top:24px;">
  <div style="font-size:9px;color:#555;margin-bottom:2px;">Acknowledged and Accepted by — ${esc(recipientName)}</div>
  <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;min-width:180px;">Date: _______________</div>
</div>`;

  return letterWrapper({ title:`Promotion Letter — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. WARNING LETTER / SHOW CAUSE NOTICE
// ═══════════════════════════════════════════════════════════════════════════════
export function warningLetterTemplate(data) {
  const { refNum='', date='', recipientName='', role='', warningType='warning', incident='', responseDeadline='', certId='' } = data;
  const isShowCause = warningType === 'showcause';

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">${isShowCause ? 'Show Cause Notice' : 'Formal Warning Letter'}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
${isShowCause ? `
<p class="para">This is a formal <strong>Show Cause Notice</strong> issued to you, ${esc(recipientName)}, ${esc(role) ? `currently serving as <strong>${esc(role)}</strong> at ${B.legal},` : 'associated with ${B.legal},'} in connection with the following documented matter of concern:</p>
` : `
<p class="para">This letter serves as a formal <strong>Written Warning</strong> issued to you, ${esc(recipientName)}, ${esc(role) ? `serving as <strong>${esc(role)}</strong> at ${B.legal},` : 'associated with ${B.legal},'} regarding the following matter of concern:</p>
`}

${incident ? `
<div style="background:#fff8f8;border-left:3px solid #dc2626;padding:14px 18px;margin:16px 0;border-radius:0 6px 6px 0;">
  <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#dc2626;margin-bottom:6px;">Documented Incident / Deficient Performance Details</div>
  <p style="font-size:11px;color:#1e293b;line-height:1.75;margin:0;">${esc(incident)}</p>
</div>` : `
<div style="background:#fff8f8;border-left:3px solid #dc2626;padding:14px 18px;margin:16px 0;border-radius:0 6px 6px 0;">
  <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#dc2626;margin-bottom:6px;">Reason for Notification</div>
  <p style="font-size:11px;color:#1e293b;line-height:1.75;margin:0;">Non-compliance with designated project timelines, deficiency in work quality standards, or breach of workplace communication policies.</p>
</div>
`}

${isShowCause ? `
<p class="para">You are hereby directed to submit a written explanation to the HR department within <strong>${esc(responseDeadline) || '48 hours'}</strong> of receipt of this notice, explaining why appropriate disciplinary action should not be initiated against you under the company's service rules and code of conduct.</p>
<p class="para">Please be advised that failure to respond within the stipulated time, or submission of an explanation found to be unsatisfactory by the management, may result in immediate escalation of disciplinary measures, up to and including termination of your association with ${B.legal} without further notice.</p>
` : `
<p class="para">Please consider this communication as your formal warning. You are expected to immediately correct the aforementioned performance or behavioral issues and ensure complete compliance with ${B.legal}'s policies, code of conduct, and project delivery frameworks going forward.</p>
<p class="para">Please note that failure to rectify these issues, or any recurrence of similar behavior, will lead to stricter disciplinary measures. This may include a formal Performance Improvement Plan (PIP), withholding of increments, or termination of your association with the company.</p>
`}

<p class="para" style="margin-bottom:24px;">Please acknowledge receipt of this notice by signing and returning the duplicate copy of this letter to the HR department immediately.</p>

${signatureBlockHTML()}

<div style="margin-top:24px;">
  <div style="font-size:9px;color:#555;margin-bottom:2px;">Acknowledged by — ${esc(recipientName)}</div>
  <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;min-width:180px;">Date: _______________</div>
</div>`;

  return letterWrapper({ title:`${isShowCause?'Show Cause Notice':'Warning Letter'} — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. SALARY REVISION LETTER
// ═══════════════════════════════════════════════════════════════════════════════
export function salaryRevisionTemplate(data) {
  const { refNum='', date='', recipientName='', role='', oldSalary='', newSalary='', effectiveDate='', certId='' } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Salary Revision / Compensation Restructuring Letter</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">We are pleased to formally inform you that, in recognition of your outstanding performance, consistent dedication, and significant contributions to <strong>${B.legal}</strong> during the recent appraisal review, your annual compensation structure has been revised, effective from <strong>${fmtDate(effectiveDate)}</strong>.</p>

<p class="para">The details of your revised compensation structure and designation parameters are detailed below. This adjustment reflects our appreciation of your professional growth and our confidence in your ongoing contributions to the company.</p>

<div class="section-title">Revised Compensation Structure</div>
<table class="highlight-table">
  <tr><td>Employee Name</td><td>${esc(recipientName)}</td></tr>
  <tr><td>Current Designation</td><td>${esc(role)}</td></tr>
  ${oldSalary ? `<tr><td>Previous CTC / Compensation</td><td>${esc(oldSalary)}</td></tr>` : ''}
  <tr><td>Revised CTC / Compensation</td><td><strong>${esc(newSalary)}</strong></td></tr>
  <tr><td>Effective Date</td><td>${fmtDate(effectiveDate)}</td></tr>
</table>

<p class="para">Please note that all other terms and conditions of your employment contract, including confidentiality clauses, intellectual property declarations, and service protocols, continue to remain in full force and effect. Your compensation is strictly confidential, and we expect you to maintain this confidentiality.</p>

<p class="para">We thank you for your commitment and hard work. We are excited about your career path at ${B.legal} and look forward to scaling new milestones together in the coming periods.</p>

<p class="para" style="margin-bottom:24px;">Please sign and return the duplicate copy of this letter as acknowledgment and acceptance of the revised terms.</p>

${signatureBlockHTML()}

<div style="margin-top:24px;">
  <div style="font-size:9px;color:#555;margin-bottom:2px;">Acknowledged and Accepted by — ${esc(recipientName)}</div>
  <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;min-width:180px;">Date: _______________</div>
</div>`;

  return letterWrapper({ title:`Salary Revision — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SALARY / STIPEND SLIP (monthly payslip)
// ═══════════════════════════════════════════════════════════════════════════════
export const PAYSLIP_EARNINGS = [
  ['basicPay', 'Basic Pay'], ['hra', 'House Rent Allowance'], ['specialAllowance', 'Special Allowance'],
  ['conveyance', 'Conveyance Allowance'], ['bonus', 'Bonus / Incentive'], ['otherEarnings', 'Other Earnings'],
];
export const PAYSLIP_DEDUCTIONS = [
  ['pfDeduction', 'Provident Fund (Employee)'], ['professionalTax', 'Professional Tax'], ['tds', 'Income Tax (TDS)'],
  ['lopDeduction', 'Loss of Pay'], ['otherDeductions', 'Other Deductions'],
];

/** Parse an amount typed as "25,000" / "₹ 25000.50" → 25000.5 (invalid → 0) */
export function amt(v) {
  const n = parseFloat(String(v ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
export function payslipTotals(d) {
  const gross = PAYSLIP_EARNINGS.reduce((s, [k]) => s + amt(d[k]), 0);
  const deductions = PAYSLIP_DEDUCTIONS.reduce((s, [k]) => s + amt(d[k]), 0);
  return { gross, deductions, net: Math.round((gross - deductions) * 100) / 100 };
}
export function inr(n) {
  return '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 125050.5 → "Rupees One Lakh Twenty Five Thousand Fifty and Paise Fifty Only" (Indian numbering) */
export function rupeesInWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`;
  const three = x => `${x >= 100 ? ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : ''}${x % 100 ? two(x % 100) : ''}`;
  const words = x => {
    if (x === 0) return 'Zero';
    const parts = [];
    const crore = Math.floor(x / 1e7); x %= 1e7;
    const lakh = Math.floor(x / 1e5); x %= 1e5;
    const thousand = Math.floor(x / 1e3); x %= 1e3;
    if (crore) parts.push(`${words(crore)} Crore`);
    if (lakh) parts.push(`${two(lakh)} Lakh`);
    if (thousand) parts.push(`${two(thousand)} Thousand`);
    if (x) parts.push(three(x));
    return parts.join(' ');
  };
  const total = Math.round(Math.max(0, Number(n) || 0) * 100);
  const rupees = Math.floor(total / 100), paise = total % 100;
  return `Rupees ${words(rupees)}${paise ? ` and Paise ${two(paise)}` : ''} Only`;
}

function fmtMonth(m) {
  if (!/^\d{4}-\d{2}$/.test(m || '')) return esc(m || '—');
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
/** Show only the last 4 digits of a bank account */
function maskAccount(a) {
  const s = String(a || '').replace(/\s/g, '');
  return s.length > 4 ? 'XXXX' + s.slice(-4) : s;
}

export function salarySlipTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', certId='', payslipType='Salary Slip',
    payMonth='', employeeCode='', department='', joiningDate='', pan='', uan='',
    bankName='', bankAccount='', workingDays='', paidDays='', paymentDate='', paymentMode='Bank Transfer',
  } = data;
  const isStipend = payslipType === 'Stipend Slip';
  const { gross, deductions, net } = payslipTotals(data);
  const lop = Math.max(0, (parseFloat(workingDays) || 0) - (parseFloat(paidDays) || 0));

  const earnings = PAYSLIP_EARNINGS.filter(([k]) => amt(data[k]) > 0)
    .map(([k, label]) => [k === 'basicPay' && isStipend ? 'Stipend' : label, amt(data[k])]);
  const deds = PAYSLIP_DEDUCTIONS.filter(([k]) => amt(data[k]) > 0).map(([k, label]) => [label, amt(data[k])]);
  const rows = Math.max(earnings.length, deds.length, 1);
  const cell = (r) => r ? `<td>${esc(r[0])}</td><td class="num">${inr(r[1])}</td>` : '<td></td><td></td>';
  const info = (label, value) => value ? `<tr><td>${label}</td><td>${value}</td></tr>` : '';

  const body = `
<style>
  .ps-title{ text-align:center; margin:-8px 0 18px; }
  .ps-title h1{ font-size:15px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:${B.color}; }
  .ps-title p{ font-size:10.5px; color:#64748b; margin-top:3px; font-weight:600; }
  .ps-info{ display:grid; grid-template-columns:1fr 1fr; gap:0 24px; margin-bottom:16px; }
  .ps-info table{ width:100%; border-collapse:collapse; font-size:10.5px; }
  .ps-info td{ padding:5px 8px; border-bottom:1px solid #eef2f7; color:#334155; }
  .ps-info td:first-child{ color:#64748b; font-weight:600; width:46%; }
  .ps-table{ width:100%; border-collapse:collapse; font-size:10.5px; margin-top:6px; border:1px solid #dbe3ee; }
  .ps-table th{ background:${B.color}; color:#fff; padding:8px 10px; text-align:left; font-size:9px; letter-spacing:1px; text-transform:uppercase; }
  .ps-table td{ padding:7px 10px; border-bottom:1px solid #eef2f7; color:#1e293b; }
  .ps-table td.num, .ps-table th.num{ text-align:right; white-space:nowrap; }
  .ps-table td:nth-child(3){ border-left:1px solid #dbe3ee; }
  .ps-table tr.total td{ font-weight:800; background:#f8fafc; color:${B.color}; border-top:2px solid ${B.color}; }
  .ps-net{ margin-top:16px; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,${B.color},${B.colorLight}); color:#fff; border-radius:8px; padding:14px 18px; }
  .ps-net .label{ font-size:10px; letter-spacing:1.5px; text-transform:uppercase; opacity:0.8; font-weight:700; }
  .ps-net .value{ font-size:20px; font-weight:800; color:#f0d078; }
  .ps-words{ font-size:10.5px; color:#334155; margin-top:8px; font-style:italic; }
  .ps-note{ font-size:9px; color:#94a3b8; margin-top:18px; text-align:center; }
</style>
<div class="ps-title">
  <h1>${isStipend ? 'Stipend Slip' : 'Salary Slip'}</h1>
  <p>For the month of ${fmtMonth(payMonth)}</p>
</div>
<div class="ps-info">
  <table>
    ${info(isStipend ? 'Intern Name' : 'Employee Name', `<strong>${esc(recipientName)}</strong>`)}
    ${info(isStipend ? 'Intern ID' : 'Employee ID', esc(employeeCode))}
    ${info('Designation', esc(role))}
    ${info('Department', esc(department))}
    ${info('Date of Joining', joiningDate ? fmtDate(joiningDate) : '')}
    ${info('PAN', esc(pan).toUpperCase())}
    ${info('UAN', esc(uan))}
  </table>
  <table>
    ${info('Pay Period', fmtMonth(payMonth))}
    ${info('Working Days', esc(workingDays))}
    ${info('Paid Days', esc(paidDays))}
    ${lop ? info('LOP Days', String(lop)) : ''}
    ${info('Payment Mode', esc(paymentMode))}
    ${info('Bank', [esc(bankName), esc(maskAccount(bankAccount))].filter(Boolean).join(' — '))}
    ${info('Payment Date', paymentDate ? fmtDate(paymentDate) : '')}
  </table>
</div>
<table class="ps-table">
  <tr><th>Earnings</th><th class="num">Amount</th><th>Deductions</th><th class="num">Amount</th></tr>
  ${Array.from({ length: rows }, (_, i) => `<tr>${cell(earnings[i])}${cell(deds[i])}</tr>`).join('')}
  <tr class="total"><td>Gross Earnings</td><td class="num">${inr(gross)}</td><td>Total Deductions</td><td class="num">${inr(deductions)}</td></tr>
</table>
<div class="ps-net">
  <span class="label">Net Pay${isStipend ? ' (Stipend)' : ''}</span>
  <span class="value">${inr(net)}</span>
</div>
<p class="ps-words"><strong>In words:</strong> ${rupeesInWords(net)}</p>
<p class="ps-note">This is a computer-generated ${isStipend ? 'stipend' : 'salary'} slip issued by ${B.legalDot} Its authenticity can be verified at verify.waveseed.app using the Verification ID ${esc(certId)}. The contents of this document are confidential.</p>`;

  return letterWrapper({ title: `${isStipend ? 'Stipend' : 'Salary'} Slip ${fmtMonth(payMonth)} — ${recipientName}`, refNum, date, body, verificationId: certId, docType: 'salary-slip' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. SALARY CERTIFICATE (for bank / loan / visa)
// ═══════════════════════════════════════════════════════════════════════════════
export function salaryCertificateTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', department='', joiningDate='', certId='',
    monthlyGross='', annualCtc='', monthlyNet='', letterPurpose='',
  } = data;
  const name = esc(recipientName);
  const pc = purposeClause(letterPurpose, true);
  const purposeHTML = esc(pc.lead) + (pc.value ? `<strong>${esc(pc.value)}</strong>` : '');
  const gross = amt(monthlyGross), ctc = amt(annualCtc), net = amt(monthlyNet);

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Salary Certificate — ${name}</span>
</div>
<p class="salutation">To Whomsoever It May Concern,</p>
<p class="para">This is to certify that <strong>${name}</strong> is employed with <strong>${B.legal}</strong> as ${/^[aeiou]/i.test(role) ? 'an' : 'a'} <strong>${esc(role)}</strong>${department ? ` in the <strong>${esc(department)}</strong> department` : ''}${joiningDate ? ` since <strong>${fmtDate(joiningDate)}</strong>` : ''}, and continues to be in our employment as on the date of this letter.</p>

<p class="para">As per the records of the company, their current compensation details are as follows:</p>
<table class="highlight-table">
  <tr><td>Employee Name</td><td>${name}</td></tr>
  <tr><td>Designation</td><td>${esc(role)}</td></tr>
  ${joiningDate ? `<tr><td>Date of Joining</td><td>${fmtDate(joiningDate)}</td></tr>` : ''}
  ${gross ? `<tr><td>Monthly Gross Salary</td><td><strong>${inr(gross)}</strong></td></tr>` : ''}
  ${net ? `<tr><td>Monthly Net Salary (Take-home)</td><td>${inr(net)}</td></tr>` : ''}
  ${ctc ? `<tr><td>Annual CTC</td><td><strong>${inr(ctc)}</strong> <span style="color:#64748b;">(${rupeesInWords(ctc)})</span></td></tr>` : ''}
</table>

<p class="para">This certificate is issued upon their request ${purposeHTML}. It is issued without any risk or responsibility on the part of ${B.legal} or its management, and does not constitute a guarantee, surety, or undertaking of any kind towards any financial obligation of the employee.</p>

<p class="para" style="margin-bottom:24px;">For verification of this document, please visit <strong>${verifyLink()}</strong> with the Verification ID, or contact our HR department at <strong>${mailLink()}</strong>.</p>

${signatureBlockHTML()}`;

  return letterWrapper({ title: `Salary Certificate — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ─── Master dispatcher ─────────────────────────────────────────────────────────
function renderDocument(type, data) {
  const map = {
    'internship-cert':    d => certificateTemplate({...d, certType:'internship'}),
    'employment-cert':    d => certificateTemplate({...d, certType:'employment'}),
    'course-cert':        d => certificateTemplate({...d, certType:'course'}),
    'appreciation-cert':  d => certificateTemplate({...d, certType:'appreciation'}),
    'achievement-cert':   d => certificateTemplate({...d, certType:'achievement'}),
    'volunteer-cert':     d => certificateTemplate({...d, certType:'volunteer'}),
    // Suffixless fallbacks for legacy or edited entries
    'internship':         d => certificateTemplate({...d, certType:'internship'}),
    'employment':         d => certificateTemplate({...d, certType:'employment'}),
    'course':             d => certificateTemplate({...d, certType:'course'}),
    'partnership':        d => certificateTemplate({...d, certType:'partnership'}),
    'appreciation':       d => certificateTemplate({...d, certType:'appreciation'}),
    'other':              d => certificateTemplate({...d, certType:'other'}),
    'internship-offer':   internshipOfferTemplate,
    'employment-offer':   employmentOfferTemplate,
    'experience-letter':  experienceLetterTemplate,
    'relieving-letter':   relievingLetterTemplate,
    'termination-letter': terminationLetterTemplate,
    'lor':                lorTemplate,
    'noc':                nocTemplate,
    'promotion-letter':   promotionLetterTemplate,
    'salary-revision':    salaryRevisionTemplate,
    'salary-slip':        salarySlipTemplate,
    'salary-certificate': salaryCertificateTemplate,
    'warning-letter':     warningLetterTemplate,
  };
  const fn = map[type];
  return fn ? fn(data) : '<p>Unknown template type.</p>';
}

/** Render any document. The brand snapshot stored in data.brand decides the issuer identity. */
export function generateDocument(type, data) {
  setBrand(data && data.brand);
  EMP_CODE = esc((data && (data.empCode || data.employeeCode)) || '');
  EXTRA = String((data && data.additionalTerms) || '').slice(0, 2000); EXTRA_USED = false;
  try {
    return renderDocument(type, data);
  } finally {
    setBrand(null);
    EMP_CODE = ''; EXTRA = ''; EXTRA_USED = false;
  }
}

// ─── Signed copy: the offer as issued + the candidate's acceptance record ────────
const IST = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };

function acceptanceAnnexHTML(rec) {
  if (!rec || rec.state === 'pending') return '';
  const when = new Date(rec.acceptedAt);
  const ist = when.toLocaleString('en-IN', IST).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM') + ' IST';
  const utc = when.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const electronic = rec.method === 'electronic';
  const geo = rec.geoStatus === 'granted'
    ? (rec.geoLat != null && rec.geoLon != null
        ? `${Number(rec.geoLat).toFixed(5)}, ${Number(rec.geoLon).toFixed(5)}${rec.geoAccuracyM != null ? ` (±${Math.round(rec.geoAccuracyM)} m)` : ''}`
        : 'Shared by the candidate')
    : rec.geoStatus === 'denied' ? 'Not shared (the candidate declined the browser prompt)'
    : rec.geoStatus === 'unavailable' ? 'Not available on the candidate’s device' : 'Not requested';
  const row = (k, v, mono) => `<tr><td>${k}</td><td${mono ? ' class="mono"' : ''}>${v}</td></tr>`;
  const clause = rec.consentClause || (rec.consent && rec.consent.clause) || '';
  const items = (rec.consentTexts && rec.consentTexts.length ? rec.consentTexts : (rec.consent && rec.consent.items ? rec.consent.items.map(i => i.text) : [])) || [];
  return `
<section class="annex ea">
<style>
  .ea .ea-sig{ margin:10px 0 16px; padding:14px 18px; border:1px solid var(--rule); border-left:4px solid var(--gold); background:#fbfcfe; break-inside:avoid; }
  .ea .ea-sig small{ display:block; font-size:7.5pt; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); font-weight:700; }
  .ea .ea-name{ font:400 30pt/1.2 'Great Vibes', cursive; color:var(--navy); margin:4px 0 2px; }
  .ea .ea-sub{ font-size:8.5pt; color:var(--muted); }
  .ea table{ width:100%; border-collapse:collapse; font-size:8.8pt; margin:8px 0 14px; break-inside:avoid; }
  .ea td{ padding:5px 10px; border:1px solid var(--rule); vertical-align:top; }
  .ea td:first-child{ width:30%; background:#f5f7fb; font-weight:600; color:var(--navy); }
  .ea .mono{ font-family:ui-monospace, Consolas, monospace; font-size:8pt; word-break:break-all; }
  .ea ol{ padding-left:18px; font-size:8.6pt; color:#243049; line-height:1.5; }
  .ea ol li{ margin-bottom:3px; }
  .ea .ea-note{ font-size:8pt; color:var(--muted); margin-top:8px; }
</style>
<h3 class="annex-title">${electronic ? 'ELECTRONIC ACCEPTANCE RECORD' : 'RECORD OF ACCEPTANCE'}</h3>
<p class="annex-p">${electronic
    ? `This offer was accepted electronically by <strong>${esc(rec.signedName || rec.holderName || '')}</strong> on <strong>${ist}</strong>, using the secure acceptance page of ${B.legal}. The candidate’s typed name below is their electronic signature.`
    : `The candidate returned a signed copy of this offer, which was recorded by ${B.legal} on <strong>${ist}</strong>.`}</p>
${electronic ? `<div class="ea-sig"><small>Electronically signed by</small><div class="ea-name">${esc(rec.signedName || '')}</div><div class="ea-sub">${ist}</div></div>` : ''}
<table>
  ${row('Acceptance receipt', esc(rec.receiptId || ''), true)}
  ${row('Method', electronic ? 'Electronic acceptance (typed-name e-signature)' : 'Signed copy uploaded')}
  ${row('Date and time (server)', `${ist}<br/>${utc}`)}
  ${row('IP address', esc(rec.ip || ''), true)}
  ${row('Location', esc(geo))}
  ${row('Device and browser', esc(String(rec.userAgent || '').slice(0, 160)))}
  ${rec.timeZone ? row('Time zone reported', esc(rec.timeZone)) : ''}
  ${rec.consentVersion ? row('Consent wording version', esc(rec.consentVersion)) : ''}
  ${rec.docHash ? row('Offer fingerprint (SHA-256)', esc(rec.docHash), true) : ''}
</table>
${electronic && clause ? `<h3 class="annex-title" style="margin-top:6px;">DECLARATIONS MADE BY THE CANDIDATE</h3>
<p class="annex-p"><strong>Electronic acceptance clause.</strong> ${esc(clause)}</p>
${items.length ? `<ol>${items.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}` : ''}
<p class="ea-note">The offer fingerprint is computed from the content of this offer letter at the moment of acceptance. If the letter is later altered, the fingerprint will no longer match. This record is held by ${B.legal} and can be confirmed at ${verifyLink()} by quoting the document ID.</p>
</section>`;
}

/** The offer exactly as issued, followed by the acceptance record page. */
export function generateSignedCopy(type, data, rec) {
  setBrand(data && data.brand);
  EMP_CODE = esc((data && (data.empCode || data.employeeCode)) || '');
  EXTRA = String((data && data.additionalTerms) || '').slice(0, 2000); EXTRA_USED = false;
  try {
    const html = renderDocument(type, data);
    const annex = acceptanceAnnexHTML(rec);
    return annex ? html.replace('</body>', () => annex + '\n</body>') : html;
  } finally {
    setBrand(null);
    EMP_CODE = ''; EXTRA = ''; EXTRA_USED = false;
  }
}
