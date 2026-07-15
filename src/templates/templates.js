// ─── templates.js — All printable document HTML generators ────────────────────
import { LOGO_BASE64, SIG_BASE64, STAMP_BASE64 } from './assets.js';

// ─── Shared Assets ─────────────────────────────────────────────────────────────
const GF = `https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap`;

// Header logo in black
const LOGO_HTML = `
<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
  <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:56px;object-fit:contain;" />
  <div style="font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:#0d1b3e;letter-spacing:0.5px;line-height:1;margin-top:2px;">WaveSeed Co.</div>
  <div style="font-family:'Inter',sans-serif;font-size:8px;color:#666;letter-spacing:2px;text-transform:uppercase;line-height:1;margin-top:2px;">Building Tomorrow's Wave, Today</div>
</div>`;

// Letterhead logo with white contrast backplate
const LETTERHEAD_LOGO = `
<div style="display:flex;align-items:center;gap:12px;">
  <div style="background:white;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:32px;object-fit:contain;" />
  </div>
  <div>
    <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.1;letter-spacing:0.3px;">WaveSeed Co.</div>
    <div style="font-size:8px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Building Tomorrow's Wave, Today</div>
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
  <circle cx="55" cy="55" r="39" fill="none" stroke="#0d1b3e" stroke-width="1" opacity="0.15"/>
  <!-- Laurel leaves -->
  <g fill="#0d1b3e" opacity="0.75">
    ${Array.from({length:18},(_,i)=>{
      const a=(i/18)*2*Math.PI-Math.PI/2;
      const r=46;
      const x=55+r*Math.cos(a);
      const y=55+r*Math.sin(a);
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2" ry="1" transform="rotate(${(i/18*360).toFixed(0)},${x.toFixed(1)},${y.toFixed(1)})"/>`;
    }).join('')}
  </g>
  <!-- Center elements -->
  <polygon points="55,20 57.5,27.5 65,27.5 59,32 61.5,39.5 55,35 48.5,39.5 51,32 45,27.5 52.5,27.5" fill="#0d1b3e"/>
  <text x="55" y="55" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="#0d1b3e" letter-spacing="1">${l1}</text>
  <text x="55" y="66" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="#0d1b3e" letter-spacing="1">${l2}</text>
  <polygon points="55,82 56.5,87 61,87 57.5,89.5 59,95 55,92 51,95 52.5,89.5 49,87 53.5,87" fill="#0d1b3e"/>
  
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMPLETION CERTIFICATE (Internship, Course, Employment, Appreciation, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
export function certificateTemplate(data) {
  const {
    certId='', refNum='', holderName='', holderInstitution='', holderDepartment='',
    certType='internship', role='', product='WaveBase AI', workMode='', reportingTo='',
    startDate='', endDate='', issuedDate='', issuerName='Mahender',
    issuerTitle='Founder, WaveSeed Co.', customMessage='', nameFont='cursive',
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

  const bodyText = customMessage ||
    `has successfully ${t.verb} as <strong>${esc(role)}</strong>${product ? ` at <strong>WaveSeed Co.</strong> on the <em>${esc(product)}</em> project` : ` at <strong>WaveSeed Co.</strong>`}${(startDate && endDate) ? ` during the period of <strong>${fmtDate(startDate)} to ${fmtDate(endDate)}</strong>` : ''}.`;

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
<title>Certificate — ${esc(holderName)} — WaveSeed Co.</title>
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
  .body-text { font-size:13.5px; color:#111111; line-height:1.6; max-width:680px; margin:16px auto 0; font-family: 'Montserrat', sans-serif; }
  .body-text strong { color:#0B1F3A; font-weight:700; }
  .body-subtext { font-size:11px; color:#777; margin-top:10px; line-height:1.5; font-weight: 500; }

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
    background-image: url("${LOGO_BASE64}");
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
  .print-btn:hover { background:#1e3264; }
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
      <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:76px; object-fit:contain;" />
      
      <!-- Middle: Little vertical line -->
      <div style="width:2px; height:56px; background:#C9A34A; opacity:0.85;"></div>
      
      <!-- Right: Company Name & Tagline -->
      <div style="display:flex; flex-direction:column; align-items:flex-start; justify-content:center;">
        <div style="font-family:'Montserrat',sans-serif; font-size:32px; font-weight:800; color:#0B1F3A; line-height:1.05; letter-spacing:0.5px;">WaveSeed Co.</div>
        <div style="font-family:'Montserrat',sans-serif; font-size:9px; font-weight:650; color:#888; letter-spacing:1.8px; text-transform:uppercase; margin-top:5px; line-height:1;">Building Tomorrow's Wave, Today</div>
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
      <img src="${STAMP_BASE64}" alt="Company Stamp" style="height:120px; width:120px; object-fit:contain; transform:rotate(-8deg); opacity:0.95; pointer-events:none;" />
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
        ${SIG_BASE64 ? `<img src="${SIG_BASE64}" alt="Founder Signature" style="height:36px; object-fit:contain; position:relative; z-index:2;" />` : ''}
      </div>
      <div class="sig-line"></div>
      <div class="sig-name">Mahender Banoth</div>
      <div class="sig-role">Founder, CEO &nbsp;|&nbsp; WaveSeed Co.</div>
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
    <span>www.waveseed.app</span>
    <span style="color:#C9A34A; opacity:0.4;">|</span>
    <span>careers@waveseed.app</span>
    <div style="width:50px; height:1px; background:#C9A34A; opacity:0.4;"></div>
  </div>
</div>
</body>
</html>`;
}

const COMPANY_STAMP_HTML = `
<div style="position:absolute; bottom:-16px; left:125px; z-index:1; transform:rotate(-10deg); opacity:0.85; pointer-events:none;">
  <img src="${STAMP_BASE64}" alt="Company Stamp" style="height:105px; width:105px; object-fit:contain;" />
</div>`;

export function signatureBlockHTML() {
  return `
<div class="sig-block" style="position:relative; display:inline-block; min-height:115px; margin-top:36px; text-align:left; width:100%;">
  <p class="closing" style="font-size:11px;color:#333;margin-bottom:34px;">For <strong>WaveSeed Co.</strong>,</p>
  <div style="position:relative; z-index:2; padding-left:4px;">
    ${SIG_BASE64 ? `<img src="${SIG_BASE64}" alt="Signature" style="height:48px; max-width:130px; object-fit:contain; position:absolute; top:-38px; left:12px; mix-blend-mode:multiply; filter:contrast(1.25); pointer-events:none;" />` : ''}
    <div class="sig-line" style="width:160px; height:1px; background:#cbd5e1; margin-bottom:5px;"></div>
    <div class="sig-name" style="font-family:'Inter', sans-serif; font-size:11px; font-weight:700; color:#0d1b3e; line-height:1.2; margin-bottom:1px;">Mahender Banoth</div>
    <div style="font-size:7px; color:#64748b; font-style:italic; margin-bottom:2px; font-weight:600;">Indian Institute of Technology Patna</div>
    <div class="sig-designation" style="font-size:8px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:0.5px;">Founder &amp; CEO</div>
    <div style="font-size:7px; color:#94a3b8; font-weight:500; margin-top:1px;">Building WaveSeed Co.</div>
  </div>
  ${COMPANY_STAMP_HTML}
</div>`;
}

function letterWrapper({ title, refNum='', date='', body='', confidential=true, verificationId='', docType='' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)} — WaveSeed Co.</title>
<link href="${GF}" rel="stylesheet"/>
<style>
  @page{ size:A4 portrait; margin:0; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html{ background:#f8fafc; min-height:100vh; display:flex; justify-content:center; align-items:flex-start; padding:24px 0; overflow-y:auto; overflow-x:hidden; }
  body{ width:210mm; min-height:297mm; height:auto; background:#ffffff; font-family:'Inter',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; display:flex; flex-direction:column; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:visible; flex-shrink:0; }
  /* Letterhead */
  .lh{ background:linear-gradient(135deg,#0d1b3e 0%,#1e3264 100%);padding:24px 40px 20px;display:flex;justify-content:space-between;align-items:flex-end; }
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
    background-image: url("${LOGO_BASE64}");
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
  .subject-label{ font-size:11px;font-weight:700;color:#0d1b3e; }
  .subject-text{ font-size:11px;font-weight:800;color:#0d1b3e;text-decoration:underline;text-transform:uppercase;letter-spacing:0.3px; }
  .salutation{ font-size:12px;margin-bottom:16px;color:#0f172a;font-weight:600; }
  .para{ font-size:11.5px;color:#1e293b;line-height:1.8;margin-bottom:16px;text-align:justify; }
  .highlight-table{ width:100%;border-collapse:collapse;margin:20px 0;font-size:11px; }
  .highlight-table th{ background:#0d1b3e;color:white;padding:10px 14px;text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase; }
  .highlight-table td{ padding:9px 14px;border-bottom:1px solid #e2e8f0;color:#334155; }
  .highlight-table tr:nth-child(even) td{ background:#f8fafc; }
  .highlight-table td:first-child{ font-weight:600;color:#0d1b3e;white-space:nowrap; }
  .section-title{ font-size:10.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d1b3e;margin:22px 0 10px;padding-bottom:4px;border-bottom:2px solid #c9a227;display:inline-block; }
  .bullet-list{ list-style:none;padding:0;margin:0 0 16px; }
  .bullet-list li{ font-size:11.5px;color:#1e293b;line-height:1.75;padding-left:16px;position:relative;margin-bottom:6px; }
  .bullet-list li::before{ content:'›';position:absolute;left:0;color:#c9a227;font-weight:700;font-size:13px; }
  /* Signature */
  .sig-block{ margin-top:28px; }
  .closing{ font-size:11.5px;color:#333;margin-bottom:20px; }
  .sig-name{ font-family:'Dancing Script',cursive;font-size:28px;color:#0d1b3e;font-weight:700;line-height:1; }
  .sig-line{ width:150px;height:1px;background:#ccc;margin:2px 0 4px; }
  .sig-designation{ font-size:10px;font-weight:700;color:#0d1b3e; }
  .sig-org{ font-size:9px;color:#666; }
  /* Footer */
  .lh-footer{ background:#0d1b3e;padding:10px 40px;display:flex;justify-content:space-between;align-items:center; }
  .lh-footer span{ font-size:8px;color:rgba(255,255,255,0.6); }
  .lh-footer a{ color:rgba(255,255,255,0.8); }
  .gold-strip-bottom{ height:3px;background:linear-gradient(90deg,#c9a227,#f0d078,#c9a227); }
  @media print{
    html{ background:none; padding:0; overflow:hidden; }
    body{ width:210mm; height:auto!important; min-height:297mm; margin:0!important; box-shadow:none!important; overflow:visible!important; }
    .no-print{ display:none!important; }
    .page-break{ page-break-before:always; break-before:page; }
  }
  .print-btn{ position:fixed;top:16px;right:16px;padding:10px 22px;background:#0d1b3e;color:white;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.3); }
  .print-btn:hover{ background:#1e3264; }
</style>
</head>
<body class="${docType}">
<button class="print-btn no-print" onclick="window.print()">PRINT / SAVE PDF</button>
<!-- Letterhead -->
<div class="lh">
  ${LETTERHEAD_LOGO}
  <div class="lh-contact">
    www.waveseed.app &nbsp;|&nbsp; waveseed.app<br/>
    careers@waveseed.app<br/>
    verify.waveseed.app
  </div>
</div>
<div class="gold-strip"></div>
<!-- Body -->
<div class="letter-body">
  <div class="letter-watermark"></div>
  <div style="position:relative; z-index:1;">
    <div class="ref-date">
      <span>${refNum ? `Ref: ${esc(refNum)}` : ''}</span>
      <span style="text-align:right;">
        ${verificationId ? `Verification ID: <strong>${esc(verificationId)}</strong><br/>` : ''}
        Date: ${esc(date) || today()}
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
    <div style="font-size:6.5px; font-weight:700; color:#0d1b3e; text-transform:uppercase; letter-spacing:0.3px;">Document Verified</div>
    <div style="font-size:7px; font-weight:800; color:#c9a227; font-family:monospace; margin:1px 0;">${esc(verificationId)}</div>
    <div style="font-size:6px; color:#64748b;">verify.waveseed.app</div>
  </div>
</div>` : ''}

<div style="margin-top:auto;">
  <div class="gold-strip-bottom"></div>
  <div class="lh-footer">
    <span>WaveSeed Co. &nbsp;|&nbsp; Building Tomorrow's Wave, Today</span>
    <span>This document is strictly private and confidential. &nbsp;<a href="https://waveseed.app">waveseed.app</a></span>
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
    recipientEmail='', role='', product='WaveBase AI', reportingTo='Chief Developer, WaveSeed Co.',
    startDate='', endDate='', duration='2 Months', workHours='4–5 Hours per Day',
    workMode='Remote (Work From Home)', stipend='Unpaid Internship',
    certId='',
  } = data;

  const body = `
<div class="recipient-block">
  <strong>${esc(recipientName)}</strong><br/>
  ${recipientCollege ? esc(recipientCollege)+'<br/>' : ''}
  ${recipientDept ? esc(recipientDept)+'<br/>' : ''}
  ${recipientEmail ? `Email: ${esc(recipientEmail)}` : ''}
</div>
<div class="subject-line">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Internship Offer Letter — ${esc(role)} | ${esc(product)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">We are thrilled to extend this <strong>Internship Offer</strong> to you at <strong>WaveSeed Co.</strong>, welcoming you as a <strong>${esc(role)}</strong>. At WaveSeed, we firmly believe our people are our greatest asset. We are highly selective in extending internship opportunities, and you have distinguished yourself as one of the best and brightest. We are confident you will play an integral role in shaping the future of <strong>${esc(product)}</strong> — our flagship SaaS product — and we look forward to a productive, impactful, and enriching journey together.</p>

<div class="section-title">Internship at a Glance</div>
<table class="highlight-table">
  <tr><td>Role</td><td>${esc(role)}</td></tr>
  <tr><td>Product</td><td>${esc(product)}</td></tr>
  <tr><td>Reporting To</td><td>${esc(reportingTo)}</td></tr>
  <tr><td>Duration</td><td>${esc(duration)}${(startDate && endDate) ? ' ('+fmtDate(startDate)+' – '+fmtDate(endDate)+')' : ''}</td></tr>
  <tr><td>Start Date</td><td>${fmtDate(startDate)}</td></tr>
  <tr><td>Work Mode</td><td>${esc(workMode)}</td></tr>
  <tr><td>Working Hours</td><td>${esc(workHours)}</td></tr>
  <tr><td>Stipend</td><td>${esc(stipend)}</td></tr>
</table>

<div class="section-title">Role &amp; Responsibilities</div>
<ul class="bullet-list">
  <li>Collaborating with the Chief Developer to design, build, and iterate on features for the ${esc(product)} SaaS platform.</li>
  <li>Writing clean, efficient, and well-documented front-end and back-end code.</li>
  <li>Integrating AI/ML capabilities into the platform in alignment with product requirements.</li>
  <li>Participating in technical design discussions, code reviews, and sprint planning.</li>
  <li>Conducting research and prototyping new AI-driven features as directed.</li>
  <li>Testing, debugging, and optimizing code for production readiness.</li>
  <li>Communicating progress, blockers, and ideas proactively to your mentor.</li>
</ul>

<div class="section-title">Standard Terms &amp; Conditions</div>
<ul class="bullet-list">
  <li><strong>Intellectual Property:</strong> All software, code, algorithms, designs, documents, and inventions developed during the internship belong exclusively to WaveSeed Co.</li>
  <li><strong>Non-Disclosure (NDA):</strong> You shall maintain strict confidentiality regarding all proprietary information, source code, designs, and company communications.</li>
  <li><strong>Termination:</strong> Either party may terminate the association with 15 days written notice. WaveSeed Co. reserves the right to terminate immediately for cause.</li>
</ul>

<p class="para">Please confirm your acceptance of this offer by signing below and returning a scanned copy to: <strong>careers@waveseed.app</strong></p>

${signatureBlockHTML()}

<div style="margin-top:12px;display:flex;justify-content:flex-end;">
  <div>
    <div style="font-size:9px;color:#555;margin-bottom:2px;">Accepted by — ${esc(recipientName)}</div>
    <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#333;min-width:180px;">Date: _______________</div>
  </div>
</div>

<div class="page-break no-print" style="margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 40px; margin-bottom: 20px;"></div>
<div class="annexure-section" style="position: relative; font-family: 'Inter', sans-serif;">
  <div class="section-title" style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: #0d1b3e;">TERMS AND CONDITIONS — ANNEXURE A</div>
  <p class="para" style="font-size: 10px; color: #475569; margin-bottom: 14px; line-height: 1.6; text-align: justify;">
    The following terms govern your internship with WaveSeed Co. (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list" style="padding-left: 18px; margin: 0 0 24px; font-size: 9px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 6px; list-style-type: decimal;">
    <li>The roles, responsibilities, and duties appropriate to your designation will be specified by the Company from time to time and may be modified at its sole discretion. You may also be required to provide services to the Company's affiliates, contractors, and clients as necessary.</li>
    <li>The duration of the internship is 2 (two) months with 4–5 working hours each day, commencing ${startDate ? fmtDate(startDate) : '13 May 2026'} and concluding ${endDate ? fmtDate(endDate) : '12 July 2026'}. You are required to devote your time and efforts solely to WaveSeed Co. work during this period. Please inform your mentor in advance of any upcoming commitments so that work can be planned accordingly.</li>
    <li>You will work remotely for the entire duration. Regular catch-up calls will be scheduled with the Chief Developer to review progress and overall internship experience.</li>
    <li>You will be on probation for the first 15 days. Confirmation of continued internship will be based on your mentor's assessment of your performance.</li>
    <li>All work produced during or in relation to WaveSeed Co. shall be the exclusive intellectual property of WaveSeed Co. You are prohibited from storing, copying, selling, sharing, or distributing any such work to third parties. You shall refrain from discussing your work publicly — online (blogs, social media) or offline — without prior written approval from your mentor.</li>
    <li>Data privacy and security are paramount. All student, customer, client, and company data accessed during your internship must be kept strictly confidential. WaveSeed Co. operates on a zero-tolerance policy toward any breach of data security. Upon completion of your internship, all Company data stored on your devices must be handed over to your mentor and permanently deleted from your systems.</li>
    <li>During the internship, you shall not directly or indirectly engage with any other organization (other than your college) in any capacity. Breach of this condition may result in immediate termination and liability for liquidated damages as estimated by the Company.</li>
    <li>Either party may terminate this internship with 30 days' written notice without assigning any reason. The Company reserves the right to terminate immediately in cases of indiscipline, misconduct, data breach, or any violation of these terms.</li>
    <li>You are expected to conduct yourself with utmost professionalism in all interactions with your mentor, colleagues, clients, and customers.</li>
    <li>You shall receive continuous objective feedback from your mentor and are encouraged to seek and provide feedback at every opportunity. Constructive feedback is central to the WaveSeed culture.</li>
    <li>This is an unpaid internship.</li>
    <li>A Certificate of Internship Completion will be issued upon successful completion of the internship period.</li>
    <li>Subject to your overall performance and at the management's discretion, you may receive a Letter of Recommendation.</li>
    <li>A Pre-Placement Offer (PPO) may be extended based on outstanding performance and management's discretion.</li>
    <li>WaveSeed Co. reserves the right to amend any policy or term at any time. Such changes will be communicated and shall be binding upon you.</li>
    <li>The tenure of the internship may be extended or reduced upon mutual consent of both the intern and WaveSeed Co. management.</li>
    <li>You shall at all times abide by WaveSeed Co.'s policies and code of conduct throughout your internship.</li>
    <li>You acknowledge that this offer is based on information provided by you. If any discrepancy is discovered, WaveSeed Co. reserves the right to terminate the internship immediately.</li>
    <li>You shall maintain strict confidentiality regarding all entities related to WaveSeed Co. during and after your internship. Upon termination or expiry, you shall update all professional and social profiles to reflect that you are no longer associated with the Company.</li>
    <li>All intellectual property, work product, inventions, designs, software, documentation, or other materials created during or as a consequence of your internship — whether alone or with others, during or outside working hours — shall belong exclusively to WaveSeed Co. You hereby assign all such rights to the Company and waive any moral rights thereto.</li>
    <li>You agree not to violate or attempt to violate the intellectual property rights of any third party during your internship.</li>
    <li>These Terms of Internship shall be governed by and construed in accordance with the Laws of India. This offer letter, together with Annexure A, constitutes the entire agreement between the parties and supersedes all prior discussions and representations.</li>
  </ol>

  <div class="section-title" style="margin-top: 10px; margin-bottom: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: #0d1b3e;">ACKNOWLEDGEMENT</div>
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
    probation='3 Months',
    certId='',
  } = data;

  const body = `
<div class="recipient-block"><strong>${esc(recipientName)}</strong></div>
<div class="subject-line">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Employment Offer Letter — ${esc(role)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">We are pleased to offer you the position of <strong>${esc(role)}</strong> at <strong>WaveSeed Co.</strong> Following our interview process, we are confident that your skills and experience will be a great addition to our team. We look forward to you joining us and contributing to our mission of <em>Building Tomorrow's Wave, Today</em>.</p>

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
  <li><strong>Probation:</strong> A probation period of ${esc(probation)} during which performance will be evaluated. Notice during probation is 30 days.</li>
  <li><strong>Intellectual Property Assignment:</strong> All intellectual property, code, patents, and work products created during your employment belong exclusively to WaveSeed Co.</li>
  <li><strong>Confidentiality &amp; NDA:</strong> Strict compliance with non-disclosure of proprietary software systems, client logs, and internal algorithms.</li>
  <li><strong>Termination notice:</strong> Post-confirmation, the notice period required by either party shall be 60 days in writing.</li>
</ul>

<p class="para">Please confirm your acceptance of this offer by signing below and returning a copy to: <strong>careers@waveseed.app</strong></p>

${signatureBlockHTML()}

<div style="margin-top:12px;display:flex;justify-content:flex-end;">
  <div>
    <div style="font-size:9px;color:#555;margin-bottom:2px;">Accepted by — ${esc(recipientName)}</div>
    <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#333;min-width:180px;">Date: _______________</div>
  </div>
</div>

<div class="page-break no-print" style="margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 40px; margin-bottom: 20px;"></div>
<div class="annexure-section" style="position: relative; font-family: 'Inter', sans-serif;">
  <div class="section-title" style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: #0d1b3e;">TERMS AND CONDITIONS — ANNEXURE A</div>
  <p class="para" style="font-size: 10px; color: #475569; margin-bottom: 14px; line-height: 1.6; text-align: justify;">
    The following terms govern your employment with WaveSeed Co. (referred to as 'the Company' hereinafter), and may be amended from time to time at the Company's discretion.
  </p>
  
  <ol class="terms-list" style="padding-left: 18px; margin: 0 0 24px; font-size: 9px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 6px; list-style-type: decimal;">
    <li>The roles, responsibilities, and duties appropriate to your designation will be specified by the Company from time to time and may be modified at its sole discretion. You may also be required to provide services to the Company's affiliates, contractors, and clients as necessary.</li>
    <li>The duration of your employment is permanent and indefinite, commencing ${joiningDate ? fmtDate(joiningDate) : 'upon joining'}, subject to successful completion of the probation period. You are required to devote your full time, attention, and efforts solely to the business of WaveSeed Co. during this association.</li>
    <li>You may work remotely or from the office as specified in your offer details. Regular catch-up calls and status syncs will be scheduled to review progress and performance.</li>
    <li>You will be on probation for a period of ${probation || '3 Months'}. Confirmation of employment is based on the management's assessment of your performance and conduct during probation.</li>
    <li>All software, designs, algorithms, code, documentation, and work product produced during or in relation to WaveSeed Co. shall be the exclusive intellectual property of WaveSeed Co. You are prohibited from storing, copying, selling, sharing, or distributing any such work to third parties.</li>
    <li>Data privacy and security are paramount. All customer, client, user, and company data accessed during your employment must be kept strictly confidential. WaveSeed Co. operates on a zero-tolerance policy toward any breach of data security.</li>
    <li>During your employment, you shall not directly or indirectly engage with any other organization or business in any capacity (including freelance, advisory, or part-time work) without prior written permission from the Company.</li>
    <li>Post-confirmation, either party may terminate employment with 60 days' written notice (or 30 days during probation) without assigning any reason. The Company reserves the right to terminate immediately for cause, misconduct, or data breach.</li>
    <li>You are expected to conduct yourself with utmost professionalism in all interactions with colleagues, mentors, clients, and customers.</li>
    <li>You shall receive continuous feedback from your reporting manager and are encouraged to seek and provide constructive feedback to foster a transparent growth environment.</li>
    <li>You shall receive compensation (CTC) as specified in your offer letter, subject to standard tax and statutory deductions in accordance with local regulations.</li>
    <li>Your performance and package will be reviewed annually in accordance with Company policies and discretionary management reviews.</li>
    <li>Leave allocation, holidays, working hours, and standard employee benefits shall be governed by the WaveSeed Co. Employee Handbook.</li>
    <li>The Company may provide performance bonuses or incentives based on company discretion and outstanding individual contributions.</li>
    <li>WaveSeed Co. reserves the right to amend any policy or term at any time. Such changes will be communicated and shall be binding upon you.</li>
    <li>Any modification or amendment to your roles, package, designation, or terms must be in writing and signed by both parties.</li>
    <li>You shall at all times abide by WaveSeed Co.'s policies and code of conduct throughout your employment.</li>
    <li>You acknowledge that this offer is based on information provided by you. If any discrepancy is discovered, WaveSeed Co. reserves the right to terminate the employment immediately.</li>
    <li>You shall maintain strict confidentiality regarding all entities related to WaveSeed Co. during and after your employment. Upon termination, you shall update all professional and social profiles to reflect that you are no longer associated with the Company.</li>
    <li>All intellectual property, work product, inventions, designs, software, documentation, or other materials created during or as a consequence of your employment — whether alone or with others, during or outside working hours — shall belong exclusively to WaveSeed Co. You hereby assign all such rights to the Company.</li>
    <li>You agree not to violate or attempt to violate the intellectual property rights of any third party during your employment.</li>
    <li>These Terms of Employment shall be governed by and construed in accordance with the Laws of India. This offer letter, together with Annexure A, constitutes the entire agreement between the parties.</li>
  </ol>

  <div class="section-title" style="margin-top: 10px; margin-bottom: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #c9a227; display: inline-block; text-transform: uppercase; letter-spacing: 1.5px; color: #0d1b3e;">ACKNOWLEDGEMENT</div>
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
    responsibilities='', conduct='satisfactory',
    certId='',
  } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Experience / Service Certificate — ${esc(recipientName)}</span>
</div>
<p class="salutation">To Whomsoever It May Concern,</p>
<p class="para">This is to certify that <strong>${esc(recipientName)}</strong> was associated with <strong>WaveSeed Co.</strong> as a <strong>${esc(role)}</strong>${(startDate && endDate) ? ` from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}. Throughout their tenure of service, they demonstrated high diligence, technical competency, and professional responsibility.</p>

<p class="para">During their association with WaveSeed Co., ${esc(recipientName)} made valuable contributions to our engineering and product teams. They were actively involved in code deployment, design optimization, and full-stack development. Their dedication to maintaining clean architecture, resolving complex defects, and collaborating across teams was exemplary.</p>

${responsibilities ? `<p class="para"><strong>Core Responsibilities &amp; Areas of Focus:</strong> ${esc(responsibilities)}</p>` : `
<p class="para">As a part of their core responsibilities, ${esc(recipientName)} worked on refining application logic, integrating robust API endpoints, and enhancing UI components. They ensured that all development followed best practices, security protocols, and rigorous quality assurance guidelines.</p>
`}

<p class="para">During the tenure of their service with WaveSeed Co., <strong>${esc(recipientName)}</strong> demonstrated <strong>${esc(conduct)}</strong> conduct, maintained a high level of integrity, and exhibited positive interpersonal relationships with peers and management. They completed all their designated handovers, documentation, and asset returns in accordance with company transition policies.</p>

<p class="para">We appreciate their valuable efforts, dedication, and contribution to the organization during their service period. On behalf of the management at WaveSeed Co., we wish them the absolute best in all their future career steps and professional endeavours.</p>

<p class="para" style="margin-bottom:24px;">This certificate is issued upon their request for their personal records, future employment, and academic pursuits.</p>

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
<p class="para">We acknowledge the receipt and acceptance of your resignation from the position of <strong>${esc(role)}</strong> at <strong>WaveSeed Co.</strong> This letter serves as formal confirmation that you have been officially relieved from your employment and duties with the company, effective as of the close of business hours on <strong>${fmtDate(relievingDate)}</strong>.</p>

<p class="para">We confirm that all exit formalities, full and final settlement of accounts, transition of key duties, and handover reports have been completed to the satisfaction of the management. All company assets, including hardware, intellectual property access, database keys, and email accounts in your possession, have been returned and deactivated as per the company's security policy.</p>

<p class="para">Please be reminded that your post-employment obligations, including confidentiality clauses, intellectual property rights covenants, and non-disclosure agreements signed during your onboarding, continue to remain in full force and effect. You are expected to respect and uphold these guidelines as you move forward.</p>

<p class="para">We sincerely appreciate the efforts, dedication, and service you rendered during your tenure with WaveSeed Co. We wish you great success in all your future professional pursuits and personal endeavors.</p>

<p class="para" style="margin-bottom:24px;">For any future verifications or reference checks, please refer to our registry database at <strong>verify.waveseed.app</strong> using your Verification ID, or contact our HR department directly at <strong>careers@waveseed.app</strong>.</p>

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
<p class="para">This letter serves as formal notification that your association with <strong>WaveSeed Co.</strong> as a <strong>${esc(role)}</strong> is being terminated, with the effective date of release being <strong>${fmtDate(terminationDate)}</strong>. From this date onwards, you will no longer be authorized to represent or perform any duties on behalf of WaveSeed Co.</p>

${reason ? `<p class="para"><strong>Reason for Termination / Separation:</strong> ${esc(reason)}</p>` : `
<p class="para">This decision has been reached after a thorough review of organizational alignment and operational requirements. We appreciate the efforts you put into your work during your time with us and wish you the best in finding opportunities that align with your skillset.</p>
`}

<p class="para">You are required to immediately return all Company-owned assets, including but not limited to laptops, access cards, key tokens, proprietary documents, codebases, and any other physical or digital property in your possession. Your access to all WaveSeed servers, slack channels, email accounts, and repository hosting services will be formally revoked as of the separation date.</p>

${finalSettlement ? `<p class="para"><strong>Final Settlement Terms:</strong> ${esc(finalSettlement)}</p>` : `
<p class="para">The finance team will process your full and final settlement, including any outstanding stipends, salary payouts, or expenses, within the standard corporate cycle, subject to a completed clearance certificate from your team lead.</p>
`}

<p class="para">Please remember that your post-separation obligations regarding intellectual property ownership, confidentiality, and non-disclosure remain fully binding. You must not disclose or use any proprietary data or code belonging to WaveSeed Co. at any point in the future.</p>

<p class="para" style="margin-bottom:24px;">Please acknowledge receipt of this letter by signing below. For queries related to clearance or settlement, you can contact the HR department at <strong>careers@waveseed.app</strong>.</p>

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
    issuerName='Mahender', issuerTitle='Founder, WaveSeed Co.',
    certId='',
  } = data;

  const body = `
<p class="salutation" style="margin-bottom:16px;">To Whomsoever It May Concern,</p>
<p class="para">It is with great pleasure and without reservation that I write this Letter of Recommendation for <strong>${esc(recipientName)}</strong>, who served as a <strong>${esc(role)}</strong> at <strong>WaveSeed Co.</strong>${(startDate && endDate) ? ` during the period from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}. Throughout their tenure with us, they have consistently demonstrated an outstanding work ethic, technical proficiency, and a proactive attitude toward solving complex software challenges.</p>

<p class="para">During their association with WaveSeed Co., ${esc(recipientName)} was primarily involved in the design, development, and scaling of our core SaaS applications. They demonstrated high capability in working with modern web technologies, AI integrations, and responsive user interfaces. They did not just write code; they actively participated in sprint planning, architectural design discussions, and code reviews, showing a level of mature thinking and engineering discipline that is rare in a professional cohort.</p>

${strengths ? `<p class="para"><strong>Key Strengths &amp; Technical Capabilities:</strong> ${esc(strengths)}</p>` : `
<p class="para">In terms of technical strengths, ${esc(recipientName)} exhibits exceptional analytical and problem-solving skills. They possess a deep understanding of data structures, algorithms, and modular design. They are quick to grasp complex system architectures and are highly self-driven when it comes to researching, prototyping, and implementing state-of-the-art AI-driven modules.</p>
`}

${achievements ? `<p class="para"><strong>Notable Contributions &amp; Achievements:</strong> ${esc(achievements)}</p>` : `
<p class="para">Among their notable contributions, ${esc(recipientName)} successfully developed and optimized critical features for our software suite. Their code was consistently well-documented, clean, and highly performant, resulting in smoother user experiences and improved server response times. Their dedication to quality engineering has been a valuable asset to our development cycle.</p>
`}

${recommendation ? `<p class="para">${esc(recommendation)}</p>` : `
<p class="para">Beyond their technical expertise, ${esc(recipientName)} is an excellent communicator and a reliable team player. They collaborate seamlessly with cross-functional team members, receive feedback constructively, and support peers. Their enthusiasm, professional maturity, and dedication make them stand out as a promising tech talent.</p>

<p class="para">I highly recommend <strong>${esc(recipientName)}</strong> for any technical role, academic endeavor, or research project that requires intellectual curiosity, rigorous problem-solving, and dedication. I am confident they will bring the same excellence, energy, and value to your organization as they did to ours. We wish them the absolute best in all their future professional pursuits.</p>
`}

<p class="para" style="margin-bottom:24px;">Please feel free to contact me at <strong>careers@waveseed.app</strong> if you require any additional information or verification regarding their tenure and contributions.</p>

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
<p class="para">This is to certify that <strong>${esc(recipientName)}</strong> is${(startDate && endDate) ? `/was` : ''} associated with <strong>WaveSeed Co.</strong> as a <strong>${esc(role)}</strong>${(startDate && endDate) ? ` during the period from <strong>${fmtDate(startDate)}</strong> to <strong>${fmtDate(endDate)}</strong>` : ''}. Throughout their tenure with the company, they have maintained a clean record of service and adhered to all corporate codes of conduct.</p>

<p class="para">During their association, ${esc(recipientName)} has been an integral part of our software engineering workflows. They have consistently demonstrated professional discipline, integrity, and dedication in executing their responsibilities. All their projects and handovers have been documented and handled with high standard compliance.</p>

${purpose ? `<p class="para">This No Objection Certificate is issued specifically to assist them in: <strong>${esc(purpose)}</strong>.</p>` : `
<p class="para">This No Objection Certificate is being issued upon their request to facilitate their application for higher studies, external employment opportunities, passport/visa documentation, or other formal verification procedures.</p>
`}

<p class="para">WaveSeed Co. confirms that there are no outstanding dues, liabilities, or conflicts of interest associated with ${esc(recipientName)}. We have <strong>no objection</strong> to them pursuing any of the aforementioned activities, career advancements, or academic applications. We support their aspirations and believe they will continue to excel in their future goals.</p>

<p class="para" style="margin-bottom:24px;">For any additional queries or formal verification of this document, feel free to visit <strong>verify.waveseed.app</strong> or reach out to our human resources team at <strong>careers@waveseed.app</strong>.</p>

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
    issuerName='Mahender', issuerTitle='Founder, WaveSeed Co.',
    certId='',
  } = data;

  const body = `
<div class="subject-line" style="margin-bottom:20px;">
  <span class="subject-label">Subject: </span>
  <span class="subject-text">Promotion Letter — ${esc(recipientName)}</span>
</div>
<p class="salutation">Dear ${esc(recipientName)},</p>
<p class="para">On behalf of the management at <strong>WaveSeed Co.</strong>, it gives us immense pleasure to inform you that, in recognition of your exemplary performance, high dedication, leadership capabilities, and valuable contributions, you have been <strong>promoted</strong> to the position of <strong>${esc(newRole)}</strong>.</p>

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

<p class="para">We congratulate you on this well-deserved milestone. Your growth within WaveSeed Co. reflects our confidence in your talents and our commitment to nurturing internal leadership. We look forward to seeing you excel and drive positive changes in this new role.</p>

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
<p class="para">This is a formal <strong>Show Cause Notice</strong> issued to you, ${esc(recipientName)}, ${esc(role) ? `currently serving as <strong>${esc(role)}</strong> at WaveSeed Co.,` : 'associated with WaveSeed Co.,'} in connection with the following documented matter of concern:</p>
` : `
<p class="para">This letter serves as a formal <strong>Written Warning</strong> issued to you, ${esc(recipientName)}, ${esc(role) ? `serving as <strong>${esc(role)}</strong> at WaveSeed Co.,` : 'associated with WaveSeed Co.,'} regarding the following matter of concern:</p>
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
<p class="para">Please be advised that failure to respond within the stipulated time, or submission of an explanation found to be unsatisfactory by the management, may result in immediate escalation of disciplinary measures, up to and including termination of your association with WaveSeed Co. without further notice.</p>
` : `
<p class="para">Please consider this communication as your formal warning. You are expected to immediately correct the aforementioned performance or behavioral issues and ensure complete compliance with WaveSeed Co.'s policies, code of conduct, and project delivery frameworks going forward.</p>
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
<p class="para">We are pleased to formally inform you that, in recognition of your outstanding performance, consistent dedication, and significant contributions to <strong>WaveSeed Co.</strong> during the recent appraisal review, your annual compensation structure has been revised, effective from <strong>${fmtDate(effectiveDate)}</strong>.</p>

<p class="para">The details of your revised compensation structure and designation parameters are detailed below. This adjustment reflects our appreciation of your technical growth and our confidence in your ongoing contributions to the development of the company's SaaS solutions.</p>

<div class="section-title">Revised Compensation Structure</div>
<table class="highlight-table">
  <tr><td>Employee Name</td><td>${esc(recipientName)}</td></tr>
  <tr><td>Current Designation</td><td>${esc(role)}</td></tr>
  ${oldSalary ? `<tr><td>Previous CTC / Compensation</td><td>${esc(oldSalary)}</td></tr>` : ''}
  <tr><td>Revised CTC / Compensation</td><td><strong>${esc(newSalary)}</strong></td></tr>
  <tr><td>Effective Date</td><td>${fmtDate(effectiveDate)}</td></tr>
</table>

<p class="para">Please note that all other terms and conditions of your employment contract, including confidentiality clauses, intellectual property declarations, and service protocols, continue to remain in full force and effect. Your compensation is strictly confidential, and we expect you to maintain this confidentiality.</p>

<p class="para">We thank you for your commitment and hard work. We are excited about your career path at WaveSeed Co. and look forward to scaling new milestones together in the coming periods.</p>

<p class="para" style="margin-bottom:24px;">Please sign and return the duplicate copy of this letter as acknowledgment and acceptance of the revised terms.</p>

${signatureBlockHTML()}

<div style="margin-top:24px;">
  <div style="font-size:9px;color:#555;margin-bottom:2px;">Acknowledged and Accepted by — ${esc(recipientName)}</div>
  <div style="border-top:1px solid #333;padding-top:4px;font-size:9px;min-width:180px;">Date: _______________</div>
</div>`;

  return letterWrapper({ title:`Salary Revision — ${recipientName}`, refNum, date, body, verificationId: certId });
}

// ─── Master dispatcher ─────────────────────────────────────────────────────────
export function generateDocument(type, data) {
  const map = {
    'internship-cert':    d => certificateTemplate({...d, certType:'internship'}),
    'employment-cert':    d => certificateTemplate({...d, certType:'employment'}),
    'course-cert':        d => certificateTemplate({...d, certType:'course'}),
    'appreciation-cert':  d => certificateTemplate({...d, certType:'appreciation'}),
    'achievement-cert':   d => certificateTemplate({...d, certType:'achievement'}),
    'volunteer-cert':     d => certificateTemplate({...d, certType:'volunteer'}),
    'internship-offer':   internshipOfferTemplate,
    'employment-offer':   employmentOfferTemplate,
    'experience-letter':  experienceLetterTemplate,
    'relieving-letter':   relievingLetterTemplate,
    'termination-letter': terminationLetterTemplate,
    'lor':                lorTemplate,
    'noc':                nocTemplate,
    'promotion-letter':   promotionLetterTemplate,
    'salary-revision':    salaryRevisionTemplate,
    'warning-letter':     warningLetterTemplate,
  };
  const fn = map[type];
  return fn ? fn(data) : '<p>Unknown template type.</p>';
}
