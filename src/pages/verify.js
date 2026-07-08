// ─── verify.js — Public certificate verification page ─────────────────────────
import { verifyCertificate } from '../api.js';
import { LOGO_BASE64, SIG_BASE64, STAMP_BASE64 } from '../templates/assets.js';

export function initVerifyPage(app) {
  app.innerHTML = buildVerifyHTML();
  attachWaves();
  attachVerifyLogic();

  // Auto-verify if ?id= or ?ref= in URL
  const params = new URLSearchParams(window.location.search);
  const autoId  = params.get('id');
  const autoRef = params.get('ref');
  if (autoId)  { document.getElementById('cert-input').value = autoId;  runVerify('id', autoId); }
  if (autoRef) { document.getElementById('cert-input').value = autoRef; runVerify('ref', autoRef); }
}

// ─── HTML Template ─────────────────────────────────────────────────────────────
function buildVerifyHTML() {
  return `
<div id="verify-page">
  <!-- Animated Background -->
  <div class="bg-waves">${waveSVGs()}</div>
  <div class="bg-radial"></div>
  <div class="bg-radial-2"></div>

  <!-- Header -->
  <header class="site-header">
    <div class="logo">
      <div class="logo-icon">${logoSVG()}</div>
      <div class="logo-text">
        <div class="logo-name">WaveSeed Co.</div>
        <div class="logo-tagline">Building Tomorrow's Wave, Today</div>
      </div>
    </div>
    <div class="header-badge">
      <span class="dot"></span>
      Verification System Active
    </div>
    <a href="/#admin" class="admin-link" id="admin-nav-link">Admin ↗</a>
  </header>

  <!-- Hero -->
  <main class="hero">
    <div class="hero-eyebrow">
      🔒 Official Certificate Registry
    </div>
    <h1 class="hero-title">
      Verify Any WaveSeed<br><span>Certificate Instantly</span>
    </h1>
    <p class="hero-subtitle">
      Enter a Certificate ID or Reference Number to verify the authenticity of any certificate issued by WaveSeed Co.
    </p>

    <!-- Search Card -->
    <div class="verify-card">
      <div class="verify-card-title">Search Certificate</div>
      <div class="search-tabs">
        <button class="search-tab active" data-mode="id"  id="tab-id">Certificate ID</button>
        <button class="search-tab"        data-mode="ref" id="tab-ref">Reference No.</button>
      </div>
      <div class="input-wrapper">
        <span class="input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          id="cert-input"
          class="verify-input"
          type="text"
          placeholder="e.g. WS-CERT-2026-0001"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <button class="btn-verify" id="btn-verify">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Verify Certificate
      </button>
      <p class="verify-hint">
        Certificate ID format: <code>WS-CERT-2026-0001</code> &nbsp;·&nbsp; Reference: <code>WS/INT/2026/AI-FS/001</code>
      </p>
    </div>
  </main>

  <!-- Result Section -->
  <section id="result-section" style="display:none;"></section>

  <!-- Footer -->
  <footer class="site-footer">
    <span>© 2026 WaveSeed Co. — <a href="https://waveseed.app" target="_blank">waveseed.app</a></span>
    <span>All certificates are cryptographically tracked · <a href="mailto:careers@waveseed.app">careers@waveseed.app</a></span>
  </footer>
</div>`;
}

// ─── Logic ─────────────────────────────────────────────────────────────────────
let currentMode = 'id';

function attachVerifyLogic() {
  // Tab switching
  document.getElementById('tab-id').addEventListener('click', () => setMode('id'));
  document.getElementById('tab-ref').addEventListener('click', () => setMode('ref'));

  // Verify button
  document.getElementById('btn-verify').addEventListener('click', handleVerify);

  // Enter key
  document.getElementById('cert-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleVerify();
  });

  // Admin link
  document.getElementById('admin-nav-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#admin';
    window.dispatchEvent(new Event('hashchange'));
  });
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('tab-id').classList.toggle('active', mode === 'id');
  document.getElementById('tab-ref').classList.toggle('active', mode === 'ref');
  const input = document.getElementById('cert-input');
  input.placeholder = mode === 'id' ? 'e.g. WS-CERT-2026-0001' : 'e.g. WS/INT/2026/AI-FS/001';
  input.value = '';
  document.getElementById('result-section').style.display = 'none';
}

async function handleVerify() {
  const raw = document.getElementById('cert-input').value.trim();
  if (!raw) {
    shakeInput();
    return;
  }
  await runVerify(currentMode, raw);
}

async function runVerify(mode, value) {
  const btn = document.getElementById('btn-verify');
  const resultSection = document.getElementById('result-section');

  // Loading state
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Verifying…`;
  resultSection.style.display = 'block';
  resultSection.innerHTML = `<div class="loading-state"><div class="spinner"></div><p class="loading-text">Checking WaveSeed certificate registry…</p></div>`;

  try {
    const payload = mode === 'id' ? { id: value } : { ref: value };
    const data = await verifyCertificate(payload);
    resultSection.innerHTML = renderResult(data, value);
  } catch (err) {
    resultSection.innerHTML = renderNetworkError();
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Verify Certificate`;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── Result Rendering ──────────────────────────────────────────────────────────
function renderResult(data, query) {
  if (!data.found) return renderNotFound(query);
  if (data.status === 'revoked') return renderRevoked(data);
  if (data.status === 'expired') return renderExpired(data);
  return renderValid(data);
}

function renderValid(d) {
  const typeLabel = certTypeLabel(d.certificateType);
  const typeOf    = certTypeOf(d.certificateType);
  
  const isLetter = d.certificateType && (
    d.certificateType.includes('offer') || 
    d.certificateType.includes('letter') || 
    d.certificateType.includes('lor') || 
    d.certificateType.includes('noc') || 
    d.certificateType.includes('revision') || 
    d.certificateType.includes('warning') || 
    d.certificateType.includes('termination') || 
    d.certificateType.includes('relieving')
  );

  let durationText = '';
  if (d.startDate && d.endDate) {
    durationText = `${formatDate(d.startDate)} – ${formatDate(d.endDate)}`;
  } else if (d.startDate) {
    durationText = `From ${formatDate(d.startDate)}`;
  }

  const detailCells = buildDetailCells(d, durationText);

  const bannerText = isLetter ? 'Document Verified — Authentic & Valid' : 'Certificate Verified — Authentic & Valid';
  const labelId = isLetter ? 'Document / Verification ID' : 'Certificate ID';
  const mainTitle = isLetter ? 'Official Document' : 'Certificate';
  const certifyText = isLetter ? 'This document officially verifies that' : 'This is to certify that';
  
  const roleTextHTML = isLetter 
    ? `was issued this official <strong>${esc(typeLabel)}</strong> for the role of<br>
       <span class="cert-role-highlight">${esc(d.role)}</span><br>
       at <strong>WaveSeed Co.</strong>${d.product ? ` — <em>${esc(d.product)}</em>` : ''}`
    : `has successfully ${completionVerb(d.certificateType)} as<br>
       <span class="cert-role-highlight">${esc(d.role)}</span><br>
       at <strong>WaveSeed Co.</strong>${d.product ? ` — <em>${esc(d.product)}</em>` : ''}
       ${durationText ? `<br>during the period of <strong>${durationText}</strong>` : ''}`;

  const bottomNote = isLetter 
    ? `This document was verified on ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} at verify.waveseed.app`
    : `This certificate was verified on ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} at verify.waveseed.app`;

  return `
<div class="cert-result-wrap">
  <div class="cert-card">
    <div class="cert-corner-br"></div>

    <!-- Status Banner -->
    <div class="cert-status-banner valid">
      <span>✅ &nbsp;${bannerText}</span>
      <span class="banner-count">Verified ${d.verificationCount} time${d.verificationCount !== 1 ? 's' : ''}</span>
    </div>

    <!-- Body -->
    <div class="cert-body">
      <div class="cert-stamp">VERIFIED</div>

      <!-- Header Row -->
      <div class="cert-header-row">
        <div class="cert-logo-area" style="display:flex;align-items:center;gap:10px;">
          <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:36px;object-fit:contain;" />
          <div>
            <div class="cert-logo-name">WaveSeed Co.</div>
            <div class="cert-logo-tagline">Building Tomorrow's Wave, Today</div>
          </div>
        </div>
        <div class="cert-id-box">
          <div class="cert-id-label">${labelId}</div>
          <div class="cert-id-value">${esc(d.certificateId)}</div>
        </div>
      </div>

      <div class="cert-gold-rule"></div>

      <!-- Title -->
      <div class="cert-main-title">${mainTitle}</div>
      <div class="cert-of">
        <div class="cert-of-line"></div>
        <div class="cert-of-text">${esc(typeOf)}</div>
        <div class="cert-of-line"></div>
      </div>

      <p class="cert-certify-text">${certifyText}</p>

      <!-- Name -->
      <div class="cert-holder-name">${esc(d.holderName)}</div>
      <div class="cert-holder-underline"></div>

      <!-- Role text -->
      <p class="cert-role-text">
        ${roleTextHTML}
      </p>

      <!-- Details Grid -->
      <div class="cert-details-grid">
        ${detailCells}
      </div>

      <!-- Reference -->
      <div class="cert-ref-row">
        <span style="font-size:0.7rem;color:#94a3b8;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Reference No.</span>
        <span class="cert-ref-badge">${esc(d.referenceNumber)}</span>
      </div>

      <!-- Footer -->
      <div class="cert-footer" style="margin-top:28px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div class="cert-sig-area" style="display:flex; flex-direction:column; align-items:center; position:relative; min-height:85px; min-width:160px; text-align:center;">
          ${SIG_BASE64 ? `<img src="${SIG_BASE64}" alt="Founder Signature" style="height:36px; max-width:110px; object-fit:contain; position:absolute; top:-26px; z-index:2; mix-blend-mode:multiply; filter:contrast(1.2);" />` : ''}
          ${STAMP_BASE64 ? `<img src="${STAMP_BASE64}" alt="Company Stamp" style="height:72px; width:72px; object-fit:contain; position:absolute; top:-36px; left:80px; z-index:1; transform:rotate(-8deg); opacity:0.85; pointer-events:none;" />` : ''}
          <div style="width:110px; height:1px; background:#cbd5e1; margin-bottom:4px; position:relative; z-index:2;"></div>
          <div class="cert-sig-name" style="font-size:0.75rem; font-weight:700; color:#0d1b3e; position:relative; z-index:2;">Mahender Banoth</div>
          <div style="font-size:0.55rem; color:#64748b; font-style:italic; line-height:1.2; position:relative; z-index:2;">Indian Institute of Technology Patna</div>
          <div class="cert-sig-role" style="font-size:0.6rem; color:#c9a227; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-top:2px; position:relative; z-index:2;">Founder &amp; CEO</div>
          <div style="font-size:0.55rem; color:#94a3b8; font-weight:500; position:relative; z-index:2;">Building WaveSeed Co.</div>
        </div>
        <div class="cert-footer-domain">
          🌐 waveseed.app
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom note -->
  <p style="text-align:center;margin-top:16px;font-size:0.72rem;color:#475569;line-height:1.6;">
    ${bottomNote}
  </p>
</div>`;
}

function renderRevoked(d) {
  return `
<div class="cert-result-wrap">
  <div class="cert-card">
    <div class="cert-status-banner revoked">
      <span>🚫 &nbsp;Certificate Revoked</span>
      <span class="banner-count">${d.revokedDate ? `Revoked on ${formatDate(d.revokedDate)}` : ''}</span>
    </div>
    <div class="cert-body">
      <div class="cert-stamp revoked-stamp">REVOKED</div>
      <div class="cert-header-row">
        <div class="cert-logo-area">
          <div class="cert-logo-name">WaveSeed Co.</div>
        </div>
        <div class="cert-id-box">
          <div class="cert-id-label">Certificate ID</div>
          <div class="cert-id-value">${esc(d.certificateId)}</div>
        </div>
      </div>
      <div class="cert-gold-rule"></div>
      <div class="cert-holder-name" style="margin:20px 0 8px;">${esc(d.holderName)}</div>
      <p class="cert-role-text">${esc(d.role)} — ${certTypeLabel(d.certificateType)}</p>
      <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="color:#dc2626;font-weight:700;font-size:0.88rem;">This certificate has been officially revoked by WaveSeed Co.</p>
        ${d.revokedReason ? `<p style="color:#7f1d1d;font-size:0.8rem;margin-top:6px;">Reason: ${esc(d.revokedReason)}</p>` : ''}
        <p style="color:#991b1b;font-size:0.75rem;margin-top:8px;">For inquiries, contact <a href="mailto:careers@waveseed.app" style="color:#b91c1c;font-weight:700;">careers@waveseed.app</a></p>
      </div>
    </div>
  </div>
</div>`;
}

function renderExpired(d) {
  return `
<div class="cert-result-wrap">
  <div class="cert-card">
    <div class="cert-status-banner expired">
      <span>⏰ &nbsp;Certificate Expired</span>
      <span class="banner-count">${d.expiryDate ? `Expired ${formatDate(d.expiryDate)}` : ''}</span>
    </div>
    <div class="cert-body">
      <div class="cert-holder-name" style="margin:16px 0 8px;">${esc(d.holderName)}</div>
      <p class="cert-role-text">${esc(d.role)}</p>
      <p style="text-align:center;color:#92400e;font-size:0.85rem;">This certificate was valid but has since expired. Contact <a href="mailto:careers@waveseed.app" style="color:#b45309;">careers@waveseed.app</a> for renewal.</p>
    </div>
  </div>
</div>`;
}

function renderNotFound(query) {
  return `
<div class="cert-result-wrap">
  <div class="error-card">
    <div class="error-icon">❌</div>
    <h2 class="error-title">Certificate Not Found</h2>
    <p class="error-msg">
      No certificate matching <strong>"${esc(query)}"</strong> exists in the WaveSeed registry.<br><br>
      Please double-check the Certificate ID or Reference Number. If you believe this is an error, contact <a href="mailto:careers@waveseed.app" style="color:#c9a227;">careers@waveseed.app</a>
    </p>
  </div>
</div>`;
}

function renderNetworkError() {
  return `
<div class="cert-result-wrap">
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h2 class="error-title">Connection Error</h2>
    <p class="error-msg">Unable to reach the verification server. Please check your connection and try again.</p>
  </div>
</div>`;
}

// ─── Detail Cells ──────────────────────────────────────────────────────────────
function buildDetailCells(d, durationText) {
  const cells = [];

  if (durationText) {
    cells.push(['Duration', durationText]);
  }
  if (d.workMode) {
    cells.push(['Work Mode', d.workMode]);
  }
  cells.push(['Issued Date', formatDate(d.issuedDate)]);
  cells.push(['Type', certTypeLabel(d.certificateType)]);
  if (d.holderInstitution) {
    cells.push(['Institution', d.holderInstitution]);
  }
  if (d.holderDepartment) {
    cells.push(['Department', d.holderDepartment]);
  }
  if (d.product) {
    cells.push(['Project / Product', d.product]);
  }
  if (d.reportingTo) {
    cells.push(['Reporting To', d.reportingTo]);
  }

  // Ensure even number of cells for grid
  if (cells.length % 2 !== 0) {
    cells.push(['Issued By', `${d.issuerName}, ${d.issuerTitle}`]);
  }

  return cells.map(([label, value]) => `
    <div class="cert-detail-cell">
      <div class="cert-detail-label">${label}</div>
      <div class="cert-detail-value">${esc(value)}</div>
    </div>`).join('');
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function certTypeLabel(type) {
  const map = {
    'internship-cert':   'Internship Completion',
    'employment-cert':   'Employment Certificate',
    'course-cert':       'Course Completion',
    'appreciation-cert': 'Appreciation Certificate',
    'achievement-cert':  'Excellence & Achievement',
    'volunteer-cert':    'Volunteer Recognition',
    'internship-offer':  'Internship Offer Letter',
    'employment-offer':  'Employment Offer Letter',
    'experience-letter': 'Experience & Service Letter',
    'relieving-letter':  'Relieving Letter',
    'termination-letter':'Termination Letter',
    'lor':                'Letter of Recommendation',
    'noc':                'No Objection Certificate',
    'promotion-letter':  'Promotion Letter',
    'salary-revision':   'Salary Revision Letter',
    'warning-letter':    'Warning / Show Cause Notice',
    internship:          'Internship Completion',
    employment:          'Employment Confirmation',
    course:              'Course Completion',
    partnership:         'Partnership',
    appreciation:        'Appreciation',
    other:               'Certificate',
  };
  return map[type] || type;
}
function certTypeOf(type) {
  const map = {
    'internship-cert':   'Internship Completion',
    'employment-cert':   'Employment Details',
    'course-cert':       'Course Completion',
    'appreciation-cert': 'Appreciation',
    'achievement-cert':  'Excellence',
    'volunteer-cert':    'Volunteer Recognition',
    'internship-offer':  'Internship Offer',
    'employment-offer':  'Employment Offer',
    'experience-letter': 'Experience & Service',
    'relieving-letter':  'Relieving Status',
    'termination-letter':'Termination',
    'lor':                'Recommendation',
    'noc':                'No Objection',
    'promotion-letter':  'Promotion Details',
    'salary-revision':   'Salary Revision',
    'warning-letter':    'Warning Notice',
    internship:          'Completion',
    employment:          'Employment',
    course:              'Completion',
    partnership:         'Partnership',
    appreciation:        'Appreciation',
    other:               'Achievement',
  };
  return map[type] || 'Official Document';
}
function completionVerb(type) {
  const map = {
    'internship-cert':   'completed the internship',
    'employment-cert':   'been employed',
    'course-cert':       'completed the course',
    'volunteer-cert':    'served as a volunteer',
    'appreciation-cert': 'demonstrated outstanding dedication',
    'achievement-cert':  'achieved outstanding performance',
    internship:          'completed the internship',
    employment:          'been employed',
    course:              'completed the course',
    partnership:         'entered into partnership',
    appreciation:        'demonstrated exemplary performance',
    other:               'fulfilled the requirements',
  };
  return map[type] || 'completed the program';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shakeInput() {
  const input = document.getElementById('cert-input');
  input.style.animation = 'none';
  input.style.borderColor = 'var(--red)';
  setTimeout(() => {
    input.style.animation = 'shake 0.4s ease';
    setTimeout(() => {
      input.style.animation = '';
      input.style.borderColor = '';
    }, 450);
  }, 10);
}

// ─── SVG Assets ────────────────────────────────────────────────────────────────
function logoSVG() {
  return `<svg width="26" height="20" viewBox="0 0 26 20" fill="none">
    <path d="M1 8 Q6 2 11 8 Q16 14 21 8 Q24 4 25 8" stroke="#c9a227" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M2 13 Q7 7 12 13 Q17 19 22 13" stroke="#c9a227" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
  </svg>`;
}

function waveSVGs() {
  return `
  <svg class="wave-1" viewBox="0 0 1440 200" preserveAspectRatio="none">
    <path d="M0,100 C240,40 480,160 720,100 C960,40 1200,160 1440,100 L1440,200 L0,200 Z" fill="#c9a227"/>
  </svg>
  <svg class="wave-2" viewBox="0 0 1440 200" preserveAspectRatio="none">
    <path d="M0,120 C360,60 720,180 1080,120 C1260,90 1380,140 1440,120 L1440,200 L0,200 Z" fill="#1e3264"/>
  </svg>
  <svg class="wave-3" viewBox="0 0 1440 200" preserveAspectRatio="none">
    <path d="M0,80 C180,140 360,20 540,80 C720,140 900,20 1080,80 C1260,140 1380,60 1440,80 L1440,200 L0,200 Z" fill="#0d1b3e"/>
  </svg>`;
}

function attachWaves() { /* waves are CSS animated */ }
