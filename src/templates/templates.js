// ─── templates.js — All printable document HTML generators ────────────────────
import { LOGO_BASE64, SIG_BASE64, STAMP_BASE64 } from './assets.js';

// ─── Brand (issuer identity) ──────────────────────────────────────────────────
// Documents store a snapshot of the issuing business's branding in data.brand, so
// letters re-render exactly as issued even if Settings change later. No snapshot
// (legacy documents) = the original WaveSeed look.
const DEFAULT_BRAND = {
  code: 'WS', name: 'WaveSeed Co.', legal: 'WaveSeed Co.',
  tagline: "Building Tomorrow's Wave, Today",
  website: 'www.waveseed.app', email: 'careers@waveseed.app', address: '',
  color: '#0d1b3e',
  logo: LOGO_BASE64, seal: STAMP_BASE64, sigImage: SIG_BASE64,
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
    color,
    colorLight: color === D.color ? '#1e3264' : lighten(color),   // default keeps the original navy gradient
    logo: (s && okImg(s.logo)) || D.logo,
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
export function brandSnapshot(business) {
  if (!business || !business.effective) return undefined;
  const ef = business.effective;
  return {
    code: business.code,
    name: business.displayName,
    legal: ef.legalName.value || business.displayName,
    tagline: ef.tagline.value || '',
    website: ef.website.value || '',
    email: ef.email.value || '',
    address: ef.address.value || '',
    color: ef.brandColor.value || '',
    logo: ef.logo.value || '',
    seal: ef.seal.value || '',
    sigName: ef.signatory.name || '',
    sigTitle: ef.signatory.title || '',
    sigImage: ef.signatory.signature || '',
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

// Letterhead logo with white contrast backplate
const LETTERHEAD_LOGO = () => `
<div style="display:flex;align-items:center;gap:12px;">
  <div style="background:white;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    <img src="${B.logo}" alt="${B.name} logo" style="height:32px;object-fit:contain;" />
  </div>
  <div>
    <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.1;letter-spacing:0.3px;">${B.name}</div>
    <div style="font-size:8px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;margin-top:2px;">${B.tagline}</div>
  </div>
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

  // Premium Gold & Navy Seal (Redesigned with White/Gold theme - no dark background)
  const premiumSealHTML = `
  <svg viewBox="0 0 120 120" width="115" height="115" style="z-index:2;">
    <!-- Outer Ring Gold -->
    <circle cx="60" cy="60" r="54" fill="none" stroke="#C9A34A" stroke-width="2.5" />
    <!-- Inner Circle White -->
    <circle cx="60" cy="60" r="48" fill="#ffffff" stroke="#C9A34A" stroke-width="0.8" />
    
    <!-- Circular Text Path for Wreath Title -->
    <path id="sealTopTextPath" d="M 18,60 A 42,42 0 1,1 102,60" fill="none" />
    <text font-family="'Montserrat', sans-serif" font-weight="700" font-size="6.8" fill="#C9A34A" letter-spacing="1.2">
      <textPath href="#sealTopTextPath" startOffset="50%" text-anchor="middle">${esc(t.badge)}</textPath>
    </text>
    
    <path id="sealBottomTextPath" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
    <text font-family="'Montserrat', sans-serif" font-weight="700" font-size="6.8" fill="#C9A34A" letter-spacing="1.2">
      <textPath href="#sealBottomTextPath" startOffset="50%" text-anchor="middle">COMPLETION</textPath>
    </text>
    
    <!-- Center star and laurel wreaths in Gold -->
    <polygon points="60,42 63,49 70,49 65,53 67,60 60,56 53,60 55,53 50,49 57,49" fill="#C9A34A" />
    <!-- Laurel Wreath -->
    <path d="M 36,65 C 38,78 50,82 60,82 M 84,65 C 82,78 70,82 60,82" fill="none" stroke="#C9A34A" stroke-width="1.5" />
    <!-- Leaves on left -->
    <path d="M 38,68 Q 42,67 43,71 Q 40,74 38,68 M 43,73 Q 48,72 49,76 Q 45,78 43,73 M 50,78 Q 55,76 56,80 Q 52,82 50,78" fill="#C9A34A" />
    <!-- Leaves on right -->
    <path d="M 82,68 Q 78,67 77,71 Q 80,74 82,68 M 77,73 Q 72,72 71,76 Q 75,78 77,73 M 70,78 Q 65,76 64,80 Q 68,82 70,78" fill="#C9A34A" />
  </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate — ${esc(holderName)} — ${B.name}</title>
<link href="${GF}" rel="stylesheet"/>
<style>
  @page { size: A4 landscape; margin: 0; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ width:100%; min-height:100vh; background:#0b1326; font-family:'Montserrat',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; display:flex; align-items:center; justify-content:center; }
  body{ position:relative; padding: 20px; overflow-y: auto; overflow-x: hidden; }
  
  /* Pure White layout with thin gold borders and generous whitespace */
  .cert-paper {
    width: 297mm;
    height: 210mm;
    background: #ffffff; 
    border: 2px solid #C9A34A;
    position: relative;
    padding: 38px 70px 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  /* Responsive Scaling for Desktop Screens to prevent overflow */
  @media (max-width: 1200px) { .cert-paper { transform: scale(0.85); } }
  @media (max-width: 1000px) { .cert-paper { transform: scale(0.7); } }
  @media (max-width: 800px) { .cert-paper { transform: scale(0.55); } }
  @media (max-width: 600px) { .cert-paper { transform: scale(0.42); } }

  /* Double gold border frame */
  .border-frame { position:absolute; inset:8px; border:1px solid #C9A34A; opacity:0.35; pointer-events:none; }

  /* Header row */
  .header-row { width:100%; display:flex; justify-content:space-between; align-items:center; z-index: 2; }
  .cert-id-box { 
    border: 1px solid #C9A34A;
    padding: 8px 16px;
    border-radius: 4px;
    text-align: center;
  }
  .cert-id-val { 
    font-size: 11px; 
    font-weight: 700; 
    color: #0B1F3A; 
    font-family: 'Montserrat', sans-serif; 
    letter-spacing: 0.5px;
  }
  .ref-badge { font-size:7px; color:#666; font-family:monospace; margin-top:2px; display:block; }

  /* Title block */
  .title-block { text-align:center; margin-top: 4px; z-index: 2; }
  .cert-main-title { font-family:'Cinzel',serif; font-size:42px; font-weight:700; letter-spacing:10px; color:#0B1F3A; text-transform:uppercase; line-height:1; }
  
  .gold-divider-wrap { display:flex; align-items:center; justify-content:center; gap:16px; margin: 8px auto 4px; }
  .gold-line { width:80px; height:1px; background:#C9A34A; }
  .gold-diamond { width:6px; height:6px; background:#C9A34A; transform:rotate(45deg); }
  
  .of-text { font-size:16px; font-weight:700; letter-spacing:6px; text-transform:uppercase; color:#C9A34A; }

  /* Body */
  .body-block { text-align:center; width:100%; z-index: 2; }
  .certify-text { font-size:12px; font-weight: 600; color:#888; letter-spacing:3px; text-transform:uppercase; margin-bottom:4px; }
  .holder-name { font-family: ${nameFontFamily}; font-size: ${nameFontSize}; font-weight: ${nameFontWeight}; font-style: ${nameFontStyle}; letter-spacing: ${nameLetterSpacing}; color:#0B1F3A; line-height:1.1; margin:6px 0; border-bottom: 2px solid #C9A34A; display: inline-block; padding-bottom: 4px; }
  .body-text { font-size:15.5px; font-weight:500; color:#111111; line-height:1.65; max-width:680px; margin:16px auto 0; font-family: 'Montserrat', sans-serif; }
  .body-text strong { color:#0B1F3A; font-weight:700; }
  .body-subtext { font-size:12.5px; color:#666; margin-top:12px; line-height:1.5; font-weight: 500; }

  /* Bottom Row */
  .bottom-row { width:100%; display:flex; justify-content:space-between; align-items:flex-end; z-index: 2; }
  
  .sig-area { text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; }
  .sig-line { width:150px; height:1px; background:#C9A34A; margin: 4px auto; }
  .sig-name { font-size:9.5px; color:#0B1F3A; font-weight:700; text-transform: uppercase; letter-spacing: 0.5px; }
  .sig-role { font-size:8px; color:#555; font-weight:500; margin-top: 1px; }

  .qr-area { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
  .qr-img { width:65px; height:65px; border:1.5px solid #C9A34A; padding:2px; background:white; }
  .qr-label { font-size:6.5px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.5px; text-align:right; }

  /* Watermark background logo */
  .watermark { 
    position:absolute; 
    top:50%; left:50%; 
    transform:translate(-50%,-50%) rotate(-12deg); 
    width: 250px; height: 250px;
    background-image: url("${B.logo}");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity:0.025; 
    pointer-events:none; 
    z-index:0; 
  }

  @media print {
    html,body{ width:297mm; height:210mm; background:white; padding:0; margin:0; display:block; }
    .cert-paper { border:2px solid #C9A34A; box-shadow:none; margin:0; transform:none !important; }
    .no-print { display:none!important; }
  }

  .print-btn { position:fixed; top:16px; right:16px; padding:10px 22px; background:#0B1F3A; color:white; border:none; border-radius:6px; font-size:13px; font-weight:800; cursor:pointer; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.3); transition:background 0.2s; }
  .print-btn:hover { background:${B.colorLight}; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">PRINT / SAVE PDF</button>

<div class="cert-paper">
  <div class="watermark"></div>
  <div class="border-frame"></div>

  <!-- Breathtaking SVG Wave Lines (4% Opacity) -->
  <!-- Top Right Wave -->
  <svg style="position:absolute; top:40px; right:40px; width:300px; height:300px; opacity:0.04; pointer-events:none; z-index:1;" viewBox="0 0 300 300">
    <path d="M 50,0 Q 150,100 100,200 T 300,300 M 100,0 Q 200,100 150,200 T 300,250 M 0,50 Q 100,150 50,250 T 250,300" fill="none" stroke="#0B1F3A" stroke-width="2" />
  </svg>
  <!-- Bottom Left Wave -->
  <svg style="position:absolute; bottom:40px; left:40px; width:300px; height:300px; opacity:0.04; pointer-events:none; z-index:1;" viewBox="0 0 300 300">
    <path d="M 0,100 Q 100,200 50,300 T 250,300 M 0,150 Q 100,250 100,300 M 50,0 Q 150,100 100,200 T 300,300" fill="none" stroke="#0B1F3A" stroke-width="2" />
  </svg>

  <!-- Top Left Corner Poly Graphic -->
  <svg style="position:absolute; top:0; left:0; width:180px; height:180px; pointer-events:none; z-index:2;" viewBox="0 0 180 180">
    <polygon points="0,0 135,0 0,135" fill="#0B1F3A" />
    <line x1="0" y1="148" x2="148" y2="0" stroke="#C9A34A" stroke-width="7" />
  </svg>

  <!-- Bottom Right Corner Poly Graphic -->
  <svg style="position:absolute; bottom:0; right:0; width:180px; height:180px; pointer-events:none; z-index:2;" viewBox="0 0 180 180">
    <polygon points="180,180 45,180 180,45" fill="#0B1F3A" />
    <line x1="32" y1="180" x2="180" y2="32" stroke="#C9A34A" stroke-width="7" />
  </svg>

  <!-- Header -->
  <div class="header-row">
    <!-- Empty left placeholder to perfectly center the logo in flexbox -->
    <div style="width: 160px;"></div>
    
    <!-- Centered Side-by-Side Logo block -->
    <div style="display:flex; align-items:center; gap:20px;">
      <!-- Left: Logo Icon -->
      <img src="${B.logo}" alt="${B.name} logo" style="height:76px; object-fit:contain;" />
      
      <!-- Middle: Little vertical line -->
      <div style="width:2px; height:56px; background:#C9A34A; opacity:0.85;"></div>
      
      <!-- Right: Company Name & Tagline -->
      <div style="display:flex; flex-direction:column; align-items:flex-start; justify-content:center;">
        <div style="font-family:'Montserrat',sans-serif; font-size:32px; font-weight:800; color:#0B1F3A; line-height:1.05; letter-spacing:0.5px;">${B.name}</div>
        <div style="font-family:'Montserrat',sans-serif; font-size:9px; font-weight:650; color:#888; letter-spacing:1.8px; text-transform:uppercase; margin-top:5px; line-height:1;">${B.tagline}</div>
      </div>
    </div>
    
    <!-- ID Box on Right -->
    <div class="cert-id-box">
      <div class="cert-id-val">${esc(certId)}</div>
      ${refNum ? `<div class="ref-badge">${esc(refNum)}</div>` : ''}
    </div>
  </div>

  <!-- Title -->
  <div class="title-block">
    <h1 class="cert-main-title">Certificate</h1>
    <div class="gold-divider-wrap">
      <div class="gold-line"></div>
      <div class="gold-diamond"></div>
      <div class="gold-line"></div>
    </div>
    <span class="of-text">of ${esc(t.of)}</span>
  </div>

  <!-- Body row containing Redesigned Seal (Left), Name (Center), and Heavily Enlarged Stamp (Right) -->
  <div style="display:flex; align-items:center; justify-content:center; gap:30px; width:100%; margin: 6px 0; min-height: 120px; z-index: 2;">
    <!-- Left: Gold Seal -->
    <div style="width: 130px; display: flex; justify-content: center; align-items: center;">
      ${premiumSealHTML}
    </div>

    <!-- Center: Certification and Name -->
    <div class="body-block" style="flex: 1; max-width: 460px;">
      <p class="certify-text">This is to certify that</p>
      <h2 class="holder-name">${esc(holderName)}</h2>
    </div>

    <!-- Right: Heavily Enlarged Company Stamp -->
    <div style="width: 130px; display: flex; justify-content: center; align-items: center;">
      <img src="${B.seal}" alt="Company Stamp" style="height:120px; width:120px; object-fit:contain; transform:rotate(-8deg); opacity:0.95; pointer-events:none;" />
    </div>
  </div>

  <!-- Description Block -->
  <div class="body-block" style="margin-top: -6px;">
    <p class="body-text">${bodyText}${holderInstitution ? ` (${esc(holderInstitution)}${holderDepartment ? ', '+esc(holderDepartment) : ''})` : ''}</p>
    <p class="body-subtext">We appreciate their dedication, commitment and valuable contributions to the projects and the team.</p>
  </div>

  <!-- Bottom -->
  <div class="bottom-row">
    <!-- Date area (Bottom Left) -->
    <div style="display:flex; flex-direction:column; gap:4px; margin-bottom: 4px; z-index: 2;">
      <div style="display:flex; align-items:center; gap:4px; font-size:7px; color:#C9A34A; font-weight:700; letter-spacing:0.5px;">
        <span>DATE OF ISSUE:</span>
      </div>
      <span style="font-size:10px; color:#111111; font-weight:700; font-family:'Montserrat',sans-serif;">${fmtDate(issuedDate || startDate)}</span>
    </div>
    
    <!-- Signature Area (Bottom Center) -->
    <div class="sig-area" style="position:relative; min-width:180px; min-height:65px; margin-bottom:-4px;">
      <div style="position:relative; display:inline-block; margin-bottom: 2px;">
        <!-- Transparent Signature Image -->
        ${B.sigImage ? `<img src="${B.sigImage}" alt="Founder Signature" style="height:36px; object-fit:contain; position:relative; z-index:2;" />` : ''}
      </div>
      <div class="sig-line"></div>
      <div class="sig-name">${B.sigName}</div>
      <div class="sig-role">${B.sigTitle} &nbsp;|&nbsp; ${B.legal}</div>
    </div>
    
    <!-- QR Code Area (Bottom Right) -->
    <div class="qr-area">
      <img class="qr-img" src="${qrCodeUrl}" alt="Verification QR Code" />
      <div class="qr-label">Scan to verify<br>this certificate</div>
    </div>
  </div>

  <!-- Footer Links (Globe and Email) -->
  <div style="display:flex; align-items:center; justify-content:center; gap:16px; font-size:9.5px; color:#0B1F3A; font-weight:600; margin-top:2px;">
    <div style="width:50px; height:1px; background:#C9A34A; opacity:0.4;"></div>
    <span>${B.website}</span>
    <span style="color:#C9A34A; opacity:0.4;">|</span>
    <span>${B.email}</span>
    <div style="width:50px; height:1px; background:#C9A34A; opacity:0.4;"></div>
  </div>
</div>
</body>
</html>`;
}

const COMPANY_STAMP_HTML = () => `
<div style="position:absolute; bottom:-16px; left:125px; z-index:1; transform:rotate(-10deg); opacity:0.85; pointer-events:none;">
  <img src="${B.seal}" alt="Company Stamp" style="height:105px; width:105px; object-fit:contain;" />
</div>`;

export function signatureBlockHTML() {
  return `
<div class="sig-block" style="position:relative; display:inline-block; min-height:115px; margin-top:36px; text-align:left; width:100%;">
  <p class="closing" style="font-size:11px;color:#333;margin-bottom:34px;">For <strong>${B.legal}</strong>,</p>
  <div style="position:relative; z-index:2; padding-left:4px;">
    ${B.sigImage ? `<img src="${B.sigImage}" alt="Signature" style="height:48px; max-width:130px; object-fit:contain; position:absolute; top:-38px; left:12px; mix-blend-mode:multiply; filter:contrast(1.25); pointer-events:none;" />` : ''}
    <div class="sig-line" style="width:160px; height:1px; background:#cbd5e1; margin-bottom:5px;"></div>
    <div class="sig-name" style="font-family:'Inter', sans-serif; font-size:11px; font-weight:700; color:${B.color}; line-height:1.2; margin-bottom:1px;">${B.sigName}</div>
    ${B.sigAffil ? `<div style="font-size:7px; color:#64748b; font-style:italic; margin-bottom:2px; font-weight:600;">${B.sigAffil}</div>` : ''}
    <div class="sig-designation" style="font-size:8px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:0.5px;">${B.sigTitle === 'Founder, CEO' ? 'Founder &amp; CEO' : B.sigTitle}</div>
    <div style="font-size:7px; color:#94a3b8; font-weight:500; margin-top:1px;">Building ${B.legal}</div>
  </div>
  ${COMPANY_STAMP_HTML()}
</div>`;
}

function letterWrapper({ title, refNum='', date='', body='', confidential=true, verificationId='', docType='' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)} — ${B.name}</title>
<link href="${GF}" rel="stylesheet"/>
<style>
  @page{ size:A4 portrait; margin:0; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html{ background:#f8fafc; min-height:100vh; display:flex; justify-content:center; align-items:flex-start; padding:24px 0; overflow-y:auto; overflow-x:hidden; }
  body{ width:210mm; min-height:297mm; height:auto; background:#ffffff; font-family:'Inter',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; display:flex; flex-direction:column; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:visible; flex-shrink:0; }
  /* Letterhead */
  .lh{ background:linear-gradient(135deg,${B.color} 0%,${B.colorLight} 100%);padding:24px 40px 20px;display:flex;justify-content:space-between;align-items:flex-end; }
  .lh-contact{ text-align:right;font-size:8px;color:rgba(255,255,255,0.7);line-height:1.8; }
  .lh-contact a{ color:rgba(255,255,255,0.85); }
  /* Gold strip */
  .gold-strip{ height:4px;background:linear-gradient(90deg,#c9a227,#f0d078,#c9a227); }
  
  /* Compact overrides for offer letters to ensure they fit on 1 page */
  .internship-offer .letter-body, .employment-offer .letter-body {
    padding: 14px 48px 10px;
  }
  .internship-offer .para, .employment-offer .para {
    font-size: 9.8px;
    line-height: 1.45;
    margin-bottom: 5px;
  }
  .internship-offer .highlight-table, .employment-offer .highlight-table {
    margin: 6px 0;
  }
  .internship-offer .highlight-table td, .employment-offer .highlight-table td {
    padding: 4px 10px;
  }
  .internship-offer .section-title, .employment-offer .section-title {
    margin: 6px 0 3px;
  }
  .internship-offer .bullet-list, .employment-offer .bullet-list {
    margin-bottom: 4px;
  }
  .internship-offer .bullet-list li, .employment-offer .bullet-list li {
    font-size: 9.5px;
    line-height: 1.4;
    margin-bottom: 2px;
  }
  .internship-offer .sig-block, .employment-offer .sig-block {
    margin-top: 6px;
    min-height: 60px;
  }
  .internship-offer .sig-block .closing, .employment-offer .sig-block .closing {
    margin-bottom: 12px;
  }
  
  /* Body */
  .letter-body{ padding:36px 48px 48px; flex:1; position:relative; }
  
  /* Watermark background logo for letters */
  .letter-watermark { 
    position:absolute; 
    top:48%; left:50%; 
    transform:translate(-50%,-50%) rotate(-12deg); 
    width: 320px; height: 320px;
    background-image: url("${B.logo}");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity:0.02; 
    pointer-events:none; 
    z-index:0; 
  }
  
  .ref-date{ display:flex;justify-content:space-between;margin-bottom:24px;font-size:10.5px;color:#475569;font-weight:500; }
  .confidential{ text-align:right;font-size:8.5px;font-weight:750;letter-spacing:2px;text-transform:uppercase;color:#dc2626;margin-bottom:16px; }
  .recipient-block{ margin-bottom:22px;font-size:11.5px;color:#1e293b;line-height:1.75; }
  .subject-line{ margin-bottom:22px; }
  .subject-label{ font-size:11px;font-weight:700;color:${B.color}; }
  .subject-text{ font-size:11px;font-weight:800;color:${B.color};text-decoration:underline;text-transform:uppercase;letter-spacing:0.3px; }
  .salutation{ font-size:12px;margin-bottom:16px;color:#0f172a;font-weight:600; }
  .para{ font-size:11.5px;color:#1e293b;line-height:1.8;margin-bottom:16px;text-align:justify; }
  .highlight-table{ width:100%;border-collapse:collapse;margin:20px 0;font-size:11px; }
  .highlight-table th{ background:${B.color};color:white;padding:10px 14px;text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase; }
  .highlight-table td{ padding:9px 14px;border-bottom:1px solid #e2e8f0;color:#334155; }
  .highlight-table tr:nth-child(even) td{ background:#f8fafc; }
  .highlight-table td:first-child{ font-weight:600;color:${B.color};white-space:nowrap; }
  .section-title{ font-size:10.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${B.color};margin:22px 0 10px;padding-bottom:4px;border-bottom:2px solid #c9a227;display:inline-block; }
  .bullet-list{ list-style:none;padding:0;margin:0 0 16px; }
  .bullet-list li{ font-size:11.5px;color:#1e293b;line-height:1.75;padding-left:16px;position:relative;margin-bottom:6px; }
  .bullet-list li::before{ content:'›';position:absolute;left:0;color:#c9a227;font-weight:700;font-size:13px; }
  /* Signature */
  .sig-block{ margin-top:28px; }
  .closing{ font-size:11.5px;color:#333;margin-bottom:20px; }
  .sig-name{ font-family:'Dancing Script',cursive;font-size:28px;color:${B.color};font-weight:700;line-height:1; }
  .sig-line{ width:150px;height:1px;background:#ccc;margin:2px 0 4px; }
  .sig-designation{ font-size:10px;font-weight:700;color:${B.color}; }
  .sig-org{ font-size:9px;color:#666; }
  /* Footer */
  .lh-footer{ background:${B.color};padding:10px 40px;display:flex;justify-content:space-between;align-items:center; }
  .lh-footer span{ font-size:8px;color:rgba(255,255,255,0.6); }
  .lh-footer a{ color:rgba(255,255,255,0.8); }
  .gold-strip-bottom{ height:3px;background:linear-gradient(90deg,#c9a227,#f0d078,#c9a227); }
  @media print{
    html{ background:none; padding:0; overflow:hidden; }
    body{ width:210mm; height:auto!important; min-height:297mm; margin:0!important; box-shadow:none!important; overflow:visible!important; }
    .no-print{ display:none!important; }
    .page-break{ page-break-before:always; break-before:page; }
  }
  .print-btn{ position:fixed;top:16px;right:16px;padding:10px 22px;background:${B.color};color:white;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.3); }
  .print-btn:hover{ background:${B.colorLight}; }
</style>
</head>
<body class="${docType}">
<button class="print-btn no-print" onclick="window.print()">PRINT / SAVE PDF</button>
<!-- Letterhead -->
<div class="lh">
  ${LETTERHEAD_LOGO()}
  <div class="lh-contact">
    ${B.website}<br/>
    ${B.email}<br/>
    ${B.address ? B.address + '<br/>' : ''}verify.waveseed.app
  </div>
</div>
<div class="gold-strip"></div>
<!-- Body -->
<div class="letter-body">
  <div class="letter-watermark"></div>
  <div style="position:relative; z-index:1;">
    <div class="ref-date">
      <span>${refNum ? `Ref: ${esc(refNum)}` : ''}${EMP_CODE ? `${refNum ? ' &nbsp;|&nbsp; ' : ''}ID: ${EMP_CODE}` : ''}</span>
      <span style="text-align:right;">
        ${verificationId ? `Verification ID: <strong>${esc(verificationId)}</strong><br/>` : ''}
        Date: ${/^\d{4}-\d{2}-\d{2}$/.test(date) ? fmtDate(date) : (esc(date) || today())}
      </span>
    </div>
    ${confidential ? '<div class="confidential">Strictly Private &amp; Confidential</div>' : ''}
    ${body}
  </div>
</div>

<!-- Verification QR Code Badge at the bottom right of the page container, above the footer -->
${verificationId ? `
<div style="position:absolute; bottom:52px; right:48px; display:flex; align-items:center; gap:8px; z-index:100; pointer-events:auto; font-family:'Inter', sans-serif; background:#fff; padding:6px 10px; border-radius:6px; border:1px solid #cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://verify.waveseed.app/?id=${verificationId}`)}" alt="Verification QR Code" style="height:44px; width:44px; object-fit:contain; border:1px solid #cbd5e1; padding:2px; background:#fff; border-radius:4px;" />
  <div style="text-align:left; line-height:1.2;">
    <div style="font-size:6.5px; font-weight:700; color:${B.color}; text-transform:uppercase; letter-spacing:0.3px;">Document Verified</div>
    <div style="font-size:7px; font-weight:800; color:#c9a227; font-family:monospace; margin:1px 0;">${esc(verificationId)}</div>
    <div style="font-size:6px; color:#64748b;">verify.waveseed.app</div>
  </div>
</div>` : ''}

<div style="margin-top:auto;">
  <div class="gold-strip-bottom"></div>
  <div class="lh-footer">
    <span>${B.name} &nbsp;|&nbsp; ${B.tagline}</span>
    <span>This document is strictly private and confidential. &nbsp;<a href="${B.siteUrl}">${B.website}</a></span>
  </div>
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
    probation='15 days', noticePeriod='15 days', responsibilities='',
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

<p class="para">Please confirm your acceptance of this offer by signing below and returning a scanned copy to: <strong>${B.email}</strong></p>

${signatureBlockHTML()}

<div style="margin-top:12px;display:flex;justify-content:flex-end;">
  <div>
    <div style="font-size:9px;color:#555;margin-bottom:2px;">Accepted by — ${esc(recipientName)}</div>
    <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#333;min-width:180px;">Date: _______________</div>
  </div>
</div>

<div class="page-break no-print" style="margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 40px; margin-bottom: 20px;"></div>
<div class="annexure-section" style="position: relative; font-family: 'Inter', sans-serif;">
  <div class="section-title" style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: ${B.color};">TERMS AND CONDITIONS — ANNEXURE A</div>
  <p class="para" style="font-size: 10px; color: #475569; margin-bottom: 14px; line-height: 1.6; text-align: justify;">
    The following terms govern your internship with ${B.legal} (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list" style="padding-left: 18px; margin: 0 0 24px; font-size: 9px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 6px; list-style-type: decimal;">
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
    <li>These Terms of Internship shall be governed by and construed in accordance with the Laws of India. This offer letter, together with Annexure A, constitutes the entire agreement between the parties and supersedes all prior discussions and representations.</li>
  </ol>

  <div class="section-title" style="margin-top: 10px; margin-bottom: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: ${B.color};">ACKNOWLEDGEMENT</div>
  <p class="para" style="font-size: 10px; color: #1e293b; line-height: 1.6; margin-bottom: 24px; text-align: justify;">
    I, <strong>${esc(recipientName)}</strong>, confirm that I have read, understood, and agree to all the terms and conditions contained in this Internship Offer Letter and Annexure A. I accept this offer and commit to fulfilling my responsibilities with dedication, professionalism, and integrity.
  </p>

  <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
    <div>
      <div style="font-size: 8px; color: #555; margin-bottom: 2px;">Signature of Intern</div>
      <div style="border-top: 1px solid #333; padding-top: 4px; font-size: 8.5px; color: #333; min-width: 180px;">Date: _______________</div>
    </div>
  </div>
</div>`;

  return letterWrapper({ title:`Internship Offer Letter — ${recipientName}`, refNum, date, body, verificationId: certId, docType: 'internship-offer' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EMPLOYMENT OFFER LETTER (Full-time)
// ═══════════════════════════════════════════════════════════════════════════════
export function employmentOfferTemplate(data) {
  const {
    refNum='', date='', recipientName='', role='', department='',
    reportingTo='', joiningDate='', workMode='', ctc='',
    probation='3 Months', noticePeriod='60 days', noticeProbation='30 days',
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

<p class="para">Please confirm your acceptance of this offer by signing below and returning a copy to: <strong>${B.email}</strong></p>

${signatureBlockHTML()}

<div style="margin-top:12px;display:flex;justify-content:flex-end;">
  <div>
    <div style="font-size:9px;color:#555;margin-bottom:2px;">Accepted by — ${esc(recipientName)}</div>
    <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#333;min-width:180px;">Date: _______________</div>
  </div>
</div>

<div class="page-break no-print" style="margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 40px; margin-bottom: 20px;"></div>
<div class="annexure-section" style="position: relative; font-family: 'Inter', sans-serif;">
  <div class="section-title" style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: ${B.color};">TERMS AND CONDITIONS — ANNEXURE A</div>
  <p class="para" style="font-size: 10px; color: #475569; margin-bottom: 14px; line-height: 1.6; text-align: justify;">
    The following terms govern your employment with ${B.legal} (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list" style="padding-left: 18px; margin: 0 0 24px; font-size: 9px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 6px; list-style-type: decimal;">
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
    <li>These Terms of Employment shall be governed by and construed in accordance with the Laws of India. This offer letter, together with Annexure A, constitutes the entire agreement between the parties.</li>
  </ol>

  <div class="section-title" style="margin-top: 10px; margin-bottom: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: ${B.color};">ACKNOWLEDGEMENT</div>
  <p class="para" style="font-size: 10px; color: #1e293b; line-height: 1.6; margin-bottom: 24px; text-align: justify;">
    I, <strong>${esc(recipientName)}</strong>, confirm that I have read, understood, and agree to all the terms and conditions contained in this Employment Offer Letter and Annexure A. I accept this offer and commit to fulfilling my responsibilities with dedication, professionalism, and integrity.
  </p>

  <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
    <div>
      <div style="font-size: 8px; color: #555; margin-bottom: 2px;">Signature of Employee</div>
      <div style="border-top: 1px solid #333; padding-top: 4px; font-size: 8.5px; color: #333; min-width: 180px;">Date: _______________</div>
    </div>
  </div>
</div>`;

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
<p class="para">We acknowledge the receipt and acceptance of your resignation from the position of <strong>${esc(role)}</strong> at <strong>${B.legalDot}</strong> This letter serves as formal confirmation that you have been officially relieved from your employment and duties with the company, effective as of the close of business hours on <strong>${fmtDate(relievingDate)}</strong>.</p>

<p class="para">We confirm that all exit formalities, full and final settlement of accounts, transition of key duties, and handover reports have been completed to the satisfaction of the management. All company assets, including hardware, intellectual property access, database keys, and email accounts in your possession, have been returned and deactivated as per the company's security policy.</p>

<p class="para">Please be reminded that your post-employment obligations, including confidentiality clauses, intellectual property rights covenants, and non-disclosure agreements signed during your onboarding, continue to remain in full force and effect. You are expected to respect and uphold these guidelines as you move forward.</p>

<p class="para">We sincerely appreciate the efforts, dedication, and service you rendered during your tenure with ${B.legalDot} We wish you great success in all your future professional pursuits and personal endeavors.</p>

<p class="para" style="margin-bottom:24px;">For any future verifications or reference checks, please refer to our registry database at <strong>verify.waveseed.app</strong> using your Verification ID, or contact our HR department directly at <strong>${B.email}</strong>.</p>

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
<p class="para">This letter serves as formal notification that your association with <strong>${B.legal}</strong> as a <strong>${esc(role)}</strong> is being terminated, with the effective date of release being <strong>${fmtDate(terminationDate)}</strong>. From this date onwards, you will no longer be authorized to represent or perform any duties on behalf of ${B.legalDot}</p>

${reason ? `<p class="para"><strong>Reason for Termination / Separation:</strong> ${esc(reason)}</p>` : `
<p class="para">This decision has been reached after a thorough review of organizational alignment and operational requirements. We appreciate the efforts you put into your work during your time with us and wish you the best in finding opportunities that align with your skillset.</p>
`}

<p class="para">You are required to immediately return all Company-owned assets, including but not limited to laptops, access cards, key tokens, proprietary documents, codebases, and any other physical or digital property in your possession. Your access to all ${B.short} servers, slack channels, email accounts, and repository hosting services will be formally revoked as of the separation date.</p>

${finalSettlement ? `<p class="para"><strong>Final Settlement Terms:</strong> ${esc(finalSettlement)}</p>` : `
<p class="para">The finance team will process your full and final settlement, including any outstanding stipends, salary payouts, or expenses, within the standard corporate cycle, subject to a completed clearance certificate from your team lead.</p>
`}

<p class="para">Please remember that your post-separation obligations regarding intellectual property ownership, confidentiality, and non-disclosure remain fully binding. You must not disclose or use any proprietary data or code belonging to ${B.legal} at any point in the future.</p>

<p class="para" style="margin-bottom:24px;">Please acknowledge receipt of this letter by signing below. For queries related to clearance or settlement, you can contact the HR department at <strong>${B.email}</strong>.</p>

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

<p class="para" style="margin-bottom:24px;">Please feel free to contact me at <strong>${B.email}</strong> if you require any additional information or verification regarding their tenure and contributions.</p>

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

<p class="para" style="margin-bottom:24px;">For any additional queries or formal verification of this document, feel free to visit <strong>verify.waveseed.app</strong> or reach out to our human resources team at <strong>${B.email}</strong>.</p>

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
${signatureBlockHTML()}
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

<p class="para" style="margin-bottom:24px;">For verification of this document, please visit <strong>verify.waveseed.app</strong> with the Verification ID, or contact our HR department at <strong>${B.email}</strong>.</p>

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
  try {
    return renderDocument(type, data);
  } finally {
    setBrand(null);
    EMP_CODE = '';
  }
}
