// ─── admin.js — Admin Dashboard ────────────────────────────────────────────────
import {
  adminLogin, adminGetStats, adminGetAll,
  adminAddCertificate, adminUpdateCertificate, adminRevoke, adminRestore, adminSeed, adminDeleteCertificate,
  adminGetEmployees, adminGetNextIds, adminUploadSigned, adminExpire
} from '../api.js';
import { initGeneratePage } from './generate.js';
import { initEmployeesPage } from './employees.js';
import { productDropdownHTML, tableSkeletonHTML } from './shared.js';
import { generateDocument } from '../templates/templates.js';


let token = sessionStorage.getItem('ws_admin_token') || null;
let currentRole = sessionStorage.getItem('ws_admin_role') || 'admin';
let allCerts = [];
let statsData = {};
let rootApp = null;

export function initAdminPage(app) {
  rootApp = app;
  if (token) {
    renderDashboard(app);
  } else {
    renderLogin(app);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function renderLogin(app) {
  rootApp = app;
  app.innerHTML = `
<div id="admin-page">
  <div class="login-overlay">
    <div class="login-card">
      <div class="login-logo">WaveSeed Co.</div>
      <div class="login-sub">Staff Portal</div>
      <p class="login-title">Select your department and enter your password</p>
      <select id="login-role" class="login-input" style="margin-bottom:12px;cursor:pointer;">
        <option value="admin">🔐 Admin — Full Access</option>
        <option value="hr">👥 HR Department</option>
        <option value="finance">💰 Finance Department</option>
        <option value="operations">⚙️ Operations Department</option>
      </select>
      <input
        id="login-pw"
        class="login-input"
        type="password"
        placeholder="Enter department password"
        autocomplete="current-password"
      />
      <button class="btn-login" id="btn-login">Access Portal</button>
      <p class="login-error" id="login-error"></p>
      <a href="/" class="login-back" id="back-home">← Back to Verification</a>
    </div>
  </div>
</div>`;

  const pw  = document.getElementById('login-pw');
  const btn = document.getElementById('btn-login');
  const err = document.getElementById('login-error');

  const doLogin = async () => {
    const password = pw.value.trim();
    if (!password) return;
    btn.textContent = 'Verifying…';
    btn.disabled = true;
    err.textContent = '';
    try {
      const res = await adminLogin(password);
      if (res.valid) {
        token = password;
        currentRole = res.role || 'admin';
        sessionStorage.setItem('ws_admin_token', token);
        sessionStorage.setItem('ws_admin_role', currentRole);
        renderDashboard(app);
      } else {
        err.textContent = 'Incorrect password. Please try again.';
        pw.value = '';
        pw.focus();
      }
    } catch {
      err.textContent = 'Connection error. Check your network.';
    } finally {
      btn.textContent = 'Access Portal';
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', doLogin);
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('back-home').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function renderDashboard(app) {
  rootApp = app;
  app.innerHTML = buildDashboardHTML();
  attachDashboardEvents(app);
  if (currentRole === 'operations') {
    const mainEl = document.querySelector('.admin-main');
    if (mainEl) {
      mainEl.innerHTML = '';
      initEmployeesPage(mainEl, token);
    }
  } else {
    await loadData();
  }
}

function buildDashboardHTML() {
  return `
<div id="admin-page">
  <!-- Sidebar -->
  <aside class="admin-sidebar">
    <div class="admin-logo">
      <div class="admin-logo-badge">WS</div>
      <div class="admin-logo-text">
        <div class="t1">WaveSeed Co.</div>
        <div class="t2">${currentRole === 'admin' ? 'Admin Panel' : currentRole.toUpperCase() + ' Dept'}</div>
      </div>
    </div>
    <nav class="admin-nav">
      ${(currentRole === 'admin' || currentRole === 'hr' || currentRole === 'finance') ? `
      <button class="admin-nav-item active" data-section="certificates" id="nav-certs">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Certificates
      </button>` : ''}
      ${(currentRole === 'admin' || currentRole === 'hr' || currentRole === 'operations') ? `
      <button class="admin-nav-item ${currentRole === 'operations' ? 'active' : ''}" data-section="employees" id="nav-employees">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Directory
      </button>` : ''}
      ${(currentRole === 'admin' || currentRole === 'hr' || currentRole === 'operations') ? `
      <button class="admin-nav-item" data-section="generate" id="nav-generate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        Generate Docs
      </button>` : ''}
      <button class="admin-nav-item" data-section="verify-link" id="nav-verify">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Public Verify
      </button>
      <a class="admin-nav-item" href="#onboard" target="_blank" style="text-decoration:none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
        Public Onboard
      </a>
      <a class="admin-nav-item" href="#download" target="_blank" style="text-decoration:none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Public Upload
      </a>
    </nav>
    <div class="admin-sidebar-footer">
      <div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:8px;text-align:center;">Logged in as <strong style="color:rgba(255,255,255,0.8);text-transform:capitalize;">${currentRole}</strong></div>
      <button class="btn-logout" id="btn-logout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
    </div>
  </aside>

  <!-- Main -->
  <div class="admin-main">
    <div class="admin-topbar">
      <div>
        <div class="admin-page-title">Certificate Registry</div>
        <div class="admin-page-subtitle">Manage all WaveSeed certificates</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn-seed" id="btn-seed" title="Seed sample certificate data">
          🌱 Seed Initial Data
        </button>
        <button class="btn-add-cert" id="btn-add">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Certificate
        </button>
      </div>
    </div>

    <div class="admin-content">
      <!-- Stats -->
      <div class="stats-grid" id="stats-grid">
        ${statsPlaceholders()}
      </div>

      <!-- Table -->
      <div class="table-toolbar">
        <div class="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="admin-search" class="admin-search" type="text" placeholder="Search by name, ID, role…" />
        </div>
        <select id="filter-type" class="filter-select">
          <option value="">All Types</option>
          <optgroup label="🎓 Certificates">
            <option value="internship-cert">Internship Completion</option>
            <option value="employment-cert">Employment Certificate</option>
            <option value="course-cert">Course Completion</option>
            <option value="appreciation-cert">Appreciation</option>
            <option value="achievement-cert">Excellence / Achievement</option>
            <option value="volunteer-cert">Volunteer Recognition</option>
          </optgroup>
          <optgroup label="📝 Letters">
            <option value="internship-offer">Internship Offer Letter</option>
            <option value="employment-offer">Employment Offer Letter</option>
            <option value="experience-letter">Experience Letter</option>
            <option value="relieving-letter">Relieving Letter</option>
            <option value="termination-letter">Termination Letter</option>
            <option value="lor">Letter of Recommendation (LOR)</option>
            <option value="noc">No Objection Certificate (NOC)</option>
            <option value="promotion-letter">Promotion Letter</option>
            <option value="salary-revision">Salary Revision</option>
            <option value="warning-letter">Warning Notice</option>
          </optgroup>
        </select>
        <select id="filter-status" class="filter-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div class="table-wrap">
        <table class="cert-table">
          <thead>
            <tr>
              <th>Certificate ID</th>
              <th>Holder Name</th>
              <th>Role</th>
              <th>Type</th>
              <th>Issued</th>
              <th>Status</th>
              <th>Verifications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="cert-tbody">
            <tr><td colspan="8" class="empty-table"><div class="spinner" style="margin:0 auto 10px;"></div><p>Loading certificates…</p></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;
}

function attachDashboardEvents(app) {
  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    token = null;
    currentRole = 'admin';
    sessionStorage.removeItem('ws_admin_token');
    sessionStorage.removeItem('ws_admin_role');
    renderLogin(app);
  });

  // Add certificate
  document.getElementById('btn-add')?.addEventListener('click', () => openAddModal());

  // Seed
  document.getElementById('btn-seed')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-seed');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '🌱 Seeding…';
    try {
      const res = await adminSeed(token);
      if (res.seeded) {
        showToast('✅ Sample certificate seeded successfully!', 'success');
      } else {
        showToast('ℹ️ Certificate already exists in the database.', 'success');
      }
      await loadData();
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🌱 Seed Initial Data';
    }
  });

  // Public verify link
  document.getElementById('nav-verify')?.addEventListener('click', () => {
    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
  });

  // Generate Docs
  document.getElementById('nav-generate')?.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-generate')?.classList.add('active');
    const mainEl = document.querySelector('.admin-main');
    if (mainEl) {
      mainEl.innerHTML = '';
      initGeneratePage(mainEl, token);
    }
  });

  // Directory
  document.getElementById('nav-employees')?.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-employees')?.classList.add('active');
    const mainEl = document.querySelector('.admin-main');
    if (mainEl) {
      mainEl.innerHTML = '';
      initEmployeesPage(mainEl, token);
    }
  });

  // Back to Certificates from Generate / Directory
  document.getElementById('nav-certs')?.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-certs')?.classList.add('active');
    renderDashboard(app);
  });

  // Filters
  document.getElementById('admin-search')?.addEventListener('input', renderTable);
  document.getElementById('filter-type')?.addEventListener('change', renderTable);
  document.getElementById('filter-status')?.addEventListener('change', renderTable);
}

// ─── Data Loading ──────────────────────────────────────────────────────────────
async function loadData() {
  const tbody = document.getElementById('cert-tbody');
  if (tbody) {
    tbody.innerHTML = tableSkeletonHTML(8, 5);
  }
  try {
    const [certs, stats] = await Promise.all([
      adminGetAll(token),
      adminGetStats(token),
    ]);
    allCerts = certs;
    statsData = stats;
    renderStats(stats);
    renderTable();
  } catch (err) {
    console.error('loadData error:', err);
    if (err.message === 'Unauthorized') {
      token = null;
      currentRole = 'admin';
      sessionStorage.removeItem('ws_admin_token');
      sessionStorage.removeItem('ws_admin_role');
      showToast('🔒 Session expired or invalid. Please log in again.', 'error');
      if (rootApp) renderLogin(rootApp);
      return;
    }
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="error-fallback-box">
              <h3>⚠️ Unable to Load Certificates</h3>
              <p>The system was unable to reach the verification server. Please check your connection and try again.</p>
              <button class="btn-primary" onclick="window.location.reload()" style="padding: 8px 16px; font-size: 0.85rem; width: auto; max-width: 150px; margin: 0 auto;">Retry Connection</button>
            </div>
          </td>
        </tr>`;
    }
    showToast('❌ Connection error. Failed to retrieve certificates.', 'error');
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
function statsPlaceholders() {
  return `
    <div class="stat-card total"><span class="stat-icon">📋</span><div class="stat-value">—</div><div class="stat-label">Total Issued</div></div>
    <div class="stat-card active"><span class="stat-icon">✅</span><div class="stat-value">—</div><div class="stat-label">Active</div></div>
    <div class="stat-card revoked"><span class="stat-icon">🚫</span><div class="stat-value">—</div><div class="stat-label">Revoked</div></div>
    <div class="stat-card views"><span class="stat-icon">👁️</span><div class="stat-value">—</div><div class="stat-label">Total Verifications</div></div>`;
}

function renderStats(s) {
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card total" style="animation-delay:0s"><span class="stat-icon">📋</span><div class="stat-value">${s.total ?? 0}</div><div class="stat-label">Total Issued</div></div>
    <div class="stat-card active" style="animation-delay:0.08s"><span class="stat-icon">✅</span><div class="stat-value">${s.active ?? 0}</div><div class="stat-label">Active</div></div>
    <div class="stat-card revoked" style="animation-delay:0.16s"><span class="stat-icon">🚫</span><div class="stat-value">${s.revoked ?? 0}</div><div class="stat-label">Revoked</div></div>
    <div class="stat-card views" style="animation-delay:0.24s"><span class="stat-icon">👁️</span><div class="stat-value">${s.totalVerifications ?? 0}</div><div class="stat-label">Total Verifications</div></div>`;
}

function getNiceTypeLabel(type) {
  const map = {
    'internship-cert':   'Internship Completion',
    'employment-cert':   'Employment Certificate',
    'course-cert':       'Course Completion',
    'appreciation-cert': 'Appreciation Certificate',
    'achievement-cert':  'Excellence & Achievement',
    'volunteer-cert':    'Volunteer Recognition',
    'internship-offer':  'Internship Offer Letter',
    'employment-offer':  'Employment Offer Letter',
    'experience-letter': 'Experience Letter',
    'relieving-letter':  'Relieving Letter',
    'termination-letter':'Termination Letter',
    'lor':                'LOR',
    'noc':                'NOC',
    'promotion-letter':  'Promotion Letter',
    'salary-revision':   'Salary Revision',
    'warning-letter':    'Warning Notice',
    'internship':        'Internship Completion',
    'employment':        'Employment Confirmation',
    'course':            'Course Completion',
    'partnership':       'Partnership',
    'appreciation':      'Appreciation',
  };
  return map[type] || type;
}

function renderTable() {
  const query     = (document.getElementById('admin-search')?.value || '').toLowerCase();
  const typeF     = document.getElementById('filter-type')?.value || '';
  const statusF   = document.getElementById('filter-status')?.value || '';

  const filtered = allCerts.filter(c => {
    const matchQ = !query || [c.holderName, c.certificateId, c.role, c.referenceNumber]
      .join(' ').toLowerCase().includes(query);
    const matchT = !typeF   || c.certificateType === typeF;
    const matchS = !statusF || c.status === statusF;
    return matchQ && matchT && matchS;
  });

  const tbody = document.getElementById('cert-tbody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-table"><div class="empty-icon">📭</div><p>No certificates found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    return `
<tr>
  <td>
    <div class="td-cert-id">${esc(c.certificateId)}</div>
    <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">${esc(c.referenceNumber)}</div>
    ${c.signedUrl ? `
      <div style="margin-top:4px;">
        <a href="${c.signedUrl}" target="_blank" class="status-pill active" style="font-size:0.65rem; padding:2px 6px; display:inline-flex; align-items:center; gap:3px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; text-decoration:none; font-weight:700; border-radius:4px;">
          <span>📄</span> Signed Doc
        </a>
      </div>
    ` : ''}
  </td>
  <td>
    <div class="td-name">${esc(c.holderName)}</div>
    ${c.holderInstitution ? `<div style="font-size:0.72rem;color:#94a3b8;">${esc(c.holderInstitution)}</div>` : ''}
  </td>
  <td><div class="td-role">${esc(c.role)}</div></td>
  <td><span class="type-pill ${c.certificateType}">${esc(getNiceTypeLabel(c.certificateType))}</span></td>
  <td style="white-space:nowrap;font-size:0.8rem;">${formatDateShort(c.issuedDate)}</td>
  <td><span class="status-pill ${c.status}"><span class="dot"></span>${c.status}</span></td>
  <td style="text-align:center;font-weight:700;color:var(--navy);">${c.verificationCount}</td>
  <td>
    <div class="actions-cell">
      <button class="btn-action view" onclick="window.wsViewCert('${esc(c.certificateId)}')" title="Open the full rendered certificate/letter document">📄 View Doc</button>
      ${(c.holderDob || c.holderEmail) ? `<button class="btn-action copy-link" onclick="window.wsCopyLink('${esc(c.referenceNumber)}')" title="Copy download link to share with recipient">🔗 Link</button>` : ''}
      <button class="btn-action email" onclick="window.wsEmailModal('${esc(c.certificateId)}')" title="Generate email template for this document">📧 Email</button>
      <button class="btn-action edit" onclick="window.wsEditModal('${c._id}')">✏️ Edit</button>
      ${c.status === 'active'
        ? `
          <button class="btn-action expire" onclick="window.wsExpire('${c._id}','${esc(c.holderName)}')" title="Mark this certificate/letter as expired">⏳ Expire</button>
          <button class="btn-action revoke" onclick="window.wsRevokeModal('${c._id}','${esc(c.holderName)}')" title="Revoke this certificate/letter">🚫 Revoke</button>
        `
        : c.status === 'expired'
        ? `<button class="btn-action restore" onclick="window.wsRestore('${c._id}')" title="Renew/Restore this certificate/letter back to active status">♻️ Renew</button>`
        : `<button class="btn-action restore" onclick="window.wsRestore('${c._id}')" title="Restore this revoked certificate/letter back to active status">↩ Restore</button>`
      }
      <button class="btn-action delete" onclick="window.wsDeleteModal('${c._id}','${esc(c.holderName)}')">🗑 Delete</button>
    </div>
  </td>
</tr>`;
  }).join('');
}

// Expose handlers on window for inline onclick (no framework)
// ─── View actual document (admin-only) ─────────────────────────────────────────────────────────────
window.wsViewCert = (certId) => {
  // Find the certificate in memory
  const cert = allCerts.find(c => c.certificateId === certId);
  if (!cert) {
    // Fallback: open public verify page if cert not found in memory
    window.open(`/?id=${certId}`, '_blank');
    return;
  }

  // Attempt to reconstruct full template data
  let data = {};

  // 1. Try to restore from stored templateData (JSON string saved at generation time)
  if (cert.templateData) {
    try {
      data = JSON.parse(cert.templateData);
    } catch { data = {}; }
  }

  // 2. Overlay/fill any missing top-level fields from the cert record itself
  //    This ensures edits made via the Edit modal are always reflected
  data.certId            = cert.certificateId;
  data.refNum            = cert.referenceNumber;
  data.holderName        = cert.holderName;
  data.recipientName     = cert.holderName;
  data.recipientEmail    = cert.holderEmail  || data.recipientEmail  || '';
  data.recipientCollege  = cert.holderInstitution || data.recipientCollege || '';
  data.recipientDept     = cert.holderDepartment  || data.recipientDept  || '';
  data.holderInstitution = cert.holderInstitution || data.holderInstitution || '';
  data.holderDepartment  = cert.holderDepartment  || data.holderDepartment || '';
  data.role              = cert.role;
  data.product           = cert.product      || data.product  || '';
  data.reportingTo       = cert.reportingTo  || data.reportingTo || '';
  data.workMode          = cert.workMode     || data.workMode  || '';
  data.issuedDate        = cert.issuedDate   || data.issuedDate || '';
  data.date              = cert.issuedDate   || data.date || '';
  data.startDate         = cert.startDate    || data.startDate || '';
  data.endDate           = cert.endDate      || data.endDate || '';
  data.issuerName        = cert.issuerName   || data.issuerName || 'Mahender';
  data.issuerTitle       = cert.issuerTitle  || data.issuerTitle || 'Founder, WaveSeed Co.';
  data.verificationId    = cert.certificateId;
  data.certType          = cert.certificateType.replace('-cert', '');

  // 3. Generate the HTML
  let html;
  try {
    html = generateDocument(cert.certificateType, data);
  } catch (err) {
    showToast('❌ Could not render document: ' + err.message, 'error');
    return;
  }

  // 4. Open in a new window
  const win = window.open('', '_blank', 'width=1100,height=860');
  if (!win) {
    showToast('❌ Popup blocked. Please allow popups for this site.', 'error');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
};

window.wsRevokeModal = (id, name) => openRevokeModal(id, name);
window.wsEditModal   = (id)       => openEditModal(id);
window.wsEmailModal  = (certId)   => openEmailModal(certId);

// Copy the recipient's download link to clipboard
window.wsCopyLink = (ref) => {
  const base = window.location.origin;
  const link = `${base}/#download?ref=${encodeURIComponent(ref)}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast('🔗 Download link copied! Paste into your email.', 'success');
  }).catch(() => {
    // Fallback for browsers that block clipboard without focus
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('🔗 Link copied!', 'success');
  });
};

window.wsRestore = async (id) => {
  if (!confirm('Restore this certificate to active status?')) return;
  try {
    await adminRestore(token, id);
    showToast('✅ Certificate restored!', 'success');
    await loadData();
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

window.wsExpire = async (id, name) => {
  if (!confirm(`Are you sure you want to mark ${name}'s certificate/letter as EXPIRED?`)) return;
  try {
    await adminExpire(token, id);
    showToast('✅ Certificate expired!', 'success');
    await loadData();
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

window.wsDeleteModal = (id, name) => openDeleteModal(id, name);

// ═══════════════════════════════════════════════════════════════════════════════
// ADD CERTIFICATE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
async function openAddModal() {
  const today = new Date().toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-modal';

  // Show inline loader while fetching employee and next ID info
  overlay.innerHTML = `
<div class="modal-box" style="max-width:400px;text-align:center;padding:40px;">
  <div class="spinner" style="margin:0 auto 16px;"></div>
  <p style="color:var(--navy);font-weight:600;">Fetching employee records & next IDs…</p>
</div>`;
  document.body.appendChild(overlay);

  let employees = [];
  let nextIds = { nextCertId: '', nextRefNum: '' };

  try {
    const [empRes, nextIdRes] = await Promise.all([
      adminGetEmployees(token),
      adminGetNextIds(token),
    ]);
    employees = empRes;
    nextIds = nextIdRes;
  } catch (err) {
    showToast('⚠️ Failed to load directories. Manual fill active.', 'error');
  }

  const empOptions = employees.map(e => 
    `<option value="${esc(e._id)}">${esc(e.name)} (${e.employeeType === 'intern' ? 'Intern' : 'Employee'})</option>`
  ).join('');

  overlay.innerHTML = `
<div class="modal-box">
  <div class="modal-header">
    <h2 class="modal-title">Issue New Certificate</h2>
    <button class="modal-close" id="close-add-modal">✕</button>
  </div>
  <div class="modal-body">
    <!-- Employee Directory Selector -->
    <div style="background:rgba(13,27,62,0.04);border:1px solid rgba(13,27,62,0.12);border-radius:8px;padding:12px 14px;margin-bottom:18px;display:flex;flex-direction:column;gap:6px;">
      <label class="form-label" style="font-weight:700;color:var(--navy);text-transform:uppercase;font-size:0.7rem;letter-spacing:0.5px;">👤 Select Employee/Intern Profile</label>
      <select id="cert-emp-select" class="form-select">
        <option value="">— Select to Auto-populate & generate IDs —</option>
        ${empOptions}
      </select>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Certificate ID <span class="req">*</span></label>
        <input id="f-certId" class="form-input" placeholder="e.g. WS-CERT-2026-0043" value="${esc(nextIds.nextCertId)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Reference Number <span class="req">*</span></label>
        <input id="f-refNum" class="form-input" placeholder="e.g. WS/INT/2026/AI-FS/043" value="${esc(nextIds.nextRefNum)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Holder Full Name <span class="req">*</span></label>
        <input id="f-name" class="form-input" placeholder="Full Name" />
      </div>
      <div class="form-group">
        <label class="form-label">Holder Email</label>
        <input id="f-email" class="form-input" type="email" placeholder="email@example.com" />
      </div>
      <div class="form-group form-full">
        <label class="form-label">Institution / Organization</label>
        <input id="f-institution" class="form-input" placeholder="College, Company, etc." />
      </div>
      <div class="form-group">
        <label class="form-label">Department / Branch</label>
        <input id="f-dept" class="form-input" placeholder="e.g. AI & ML (CSM)" />
      </div>
      <div class="form-group">
        <label class="form-label">Certificate Type <span class="req">*</span></label>
        <select id="f-type" class="form-select">
          <option value="internship">Internship Completion</option>
          <option value="employment">Employment Confirmation</option>
          <option value="course">Course Completion</option>
          <option value="partnership">Partnership</option>
          <option value="appreciation">Appreciation</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Role / Designation <span class="req">*</span></label>
        <input id="f-role" class="form-input" placeholder="e.g. AI Full Stack Developer Intern" />
      </div>
      <div class="form-group">
        <label class="form-label">Product / Project</label>
        ${productDropdownHTML('f-product')}
      </div>
      <div class="form-group">
        <label class="form-label">Reporting To</label>
        <input id="f-reporting" class="form-input" placeholder="e.g. Chief Developer, WaveSeed Co." />
      </div>
      <div class="form-group">
        <label class="form-label">Work Mode</label>
        <select id="f-workmode" class="form-select">
          <option value="">— Select —</option>
          <option value="Remote">Remote</option>
          <option value="On-site">On-site</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Issued Date <span class="req">*</span></label>
        <input id="f-issued" class="form-input" type="date" value="${today}" />
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input id="f-start" class="form-input" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input id="f-end" class="form-input" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Name</label>
        <input id="f-issuer-name" class="form-input" value="Mahender" />
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Title</label>
        <input id="f-issuer-title" class="form-input" value="Founder, WaveSeed Co." />
      </div>
      <div class="form-group form-full">
        <label class="form-label">Notes (Internal)</label>
        <textarea id="f-notes" class="form-textarea" placeholder="Optional internal notes…"></textarea>
      </div>
    </div>
    <p id="add-error" style="color:var(--red);font-size:0.8rem;margin-top:10px;min-height:18px;"></p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" id="cancel-add">Cancel</button>
    <button class="btn-primary" id="submit-add">Issue Certificate</button>
  </div>
</div>`;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal('add-modal'); });
  document.getElementById('close-add-modal').addEventListener('click', () => closeModal('add-modal'));
  document.getElementById('cancel-add').addEventListener('click', () => closeModal('add-modal'));
  document.getElementById('submit-add').addEventListener('click', submitAdd);

  // Autofill listener
  const empSelect = document.getElementById('cert-emp-select');
  empSelect.addEventListener('change', () => {
    const val = empSelect.value;
    if (!val) return;
    const emp = employees.find(e => e._id === val);
    if (!emp) return;

    document.getElementById('f-name').value = emp.name || '';
    document.getElementById('f-email').value = emp.email || '';
    document.getElementById('f-institution').value = emp.institution || '';
    document.getElementById('f-dept').value = emp.department || '';
    document.getElementById('f-role').value = emp.role || '';
    document.getElementById('f-product').value = emp.product || '';
    document.getElementById('f-reporting').value = emp.reportingTo || '';
    document.getElementById('f-workmode').value = emp.workMode || '';
    document.getElementById('f-start').value = emp.startDate || '';
    document.getElementById('f-end').value = emp.endDate || '';

    // Auto select certificate type
    const typeSelect = document.getElementById('f-type');
    typeSelect.value = emp.employeeType === 'intern' ? 'internship' : 'employment';

    // Auto-update certificate ID prefix / reference sequence depending on role
    // E.g. If employee type is employee, set WS-EMP instead of WS-CERT
    const certPrefix = emp.employeeType === 'intern' ? 'WS-CERT' : 'WS-EMP';
    const refPrefix = emp.employeeType === 'intern' ? 'WS/INT' : 'WS/EMP';
    
    const seqPart = nextIds.nextCertId.split('-').pop() || '0043';
    const refSeqPart = nextIds.nextRefNum.split('/').pop() || '043';

    document.getElementById('f-certId').value = `${certPrefix}-2026-${seqPart}`;
    document.getElementById('f-refNum').value = `${refPrefix}/2026/AI-FS/${refSeqPart}`;
  });
}


async function submitAdd() {
  const get = (id) => document.getElementById(id)?.value?.trim() || '';
  const err = document.getElementById('add-error');
  err.textContent = '';

  const certId = get('f-certId');
  const refNum = get('f-refNum');
  const name   = get('f-name');
  const role   = get('f-role');
  const issued = get('f-issued');

  // Resolve product
  const productSel = get('f-product');
  const product = productSel === '__custom__' ? get('f-product-custom') : productSel;

  if (!certId || !refNum || !name || !role || !issued) {
    err.textContent = 'Please fill all required fields (marked with *).';
    return;
  }

  const data = {
    certificateId:     certId,
    referenceNumber:   refNum,
    holderName:        name,
    holderEmail:       get('f-email') || undefined,
    holderInstitution: get('f-institution') || undefined,
    holderDepartment:  get('f-dept') || undefined,
    certificateType:   get('f-type'),
    role,
    product:           product || undefined,
    reportingTo:       get('f-reporting') || undefined,
    workMode:          get('f-workmode') || undefined,
    issuedDate:        issued,
    startDate:         get('f-start') || undefined,
    endDate:           get('f-end') || undefined,
    issuerName:        get('f-issuer-name') || 'Mahender',
    issuerTitle:       get('f-issuer-title') || 'Founder, WaveSeed Co.',
    notes:             get('f-notes') || undefined,
  };

  const btn = document.getElementById('submit-add');
  btn.disabled = true;
  btn.textContent = 'Issuing…';
  try {
    await adminAddCertificate(token, data);
    closeModal('add-modal');
    showToast(`✅ Certificate ${certId} issued successfully!`, 'success');
    await loadData();
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Issue Certificate';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT CERTIFICATE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openEditModal(id) {
  const cert = allCerts.find(c => c._id === id);
  if (!cert) return showToast('❌ Certificate not found', 'error');

  const PRODUCT_OPTIONS = [
    'WaveBase AI','WaveSeed Verify','WaveSeed Platform',
    'AI Agent Suite','AI Automation Engine','AI Analytics Dashboard','AI Content Studio','AI Workflow Builder',
    'WaveSeed Mobile App','WaveSeed Admin App','Client Portal App',
    'Custom SaaS Product','Custom CRM System','Custom ERP System','Business Automation Tool',
    'Internal R&D Project','Client Project','Consulting Engagement'
  ];
  const isKnownProduct = PRODUCT_OPTIONS.includes(cert.product);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-modal';
  overlay.innerHTML = `
<div class="modal-box">
  <div class="modal-header">
    <h2 class="modal-title">✏️ Edit Certificate</h2>
    <button class="modal-close" id="close-edit-modal">✕</button>
  </div>
  <div class="modal-body">
    <p style="font-size:0.78rem;color:#94a3b8;margin-bottom:16px;">Editing: <strong>${esc(cert.certificateId)}</strong> — ${esc(cert.holderName)}</p>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Holder Full Name <span class="req">*</span></label>
        <input id="e-name" class="form-input" value="${esc(cert.holderName)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Holder Email</label>
        <input id="e-email" class="form-input" type="email" value="${esc(cert.holderEmail || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth <span style="font-size:0.7rem;color:#94a3b8;font-weight:400;">(for download link auth)</span></label>
        <input id="e-dob" class="form-input" type="date" value="${esc(cert.holderDob || '')}" />
      </div>
      <div class="form-group form-full">
        <label class="form-label">Institution / Organization</label>
        <input id="e-institution" class="form-input" value="${esc(cert.holderInstitution || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Department / Branch</label>
        <input id="e-dept" class="form-input" value="${esc(cert.holderDepartment || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Certificate Type</label>
        <select id="e-type" class="form-select">
          <option value="internship" ${cert.certificateType==='internship'?'selected':''}>Internship Completion</option>
          <option value="employment" ${cert.certificateType==='employment'?'selected':''}>Employment Confirmation</option>
          <option value="course" ${cert.certificateType==='course'?'selected':''}>Course Completion</option>
          <option value="partnership" ${cert.certificateType==='partnership'?'selected':''}>Partnership</option>
          <option value="appreciation" ${cert.certificateType==='appreciation'?'selected':''}>Appreciation</option>
          <option value="other" ${cert.certificateType==='other'?'selected':''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Role / Designation <span class="req">*</span></label>
        <input id="e-role" class="form-input" value="${esc(cert.role)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Product / Project</label>
        ${productDropdownHTML('e-product', cert.product)}
      </div>
      <div class="form-group">
        <label class="form-label">Reporting To</label>
        <input id="e-reporting" class="form-input" value="${esc(cert.reportingTo || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Work Mode</label>
        <select id="e-workmode" class="form-select">
          <option value="">— Select —</option>
          <option value="Remote" ${cert.workMode==='Remote'?'selected':''}>Remote</option>
          <option value="On-site" ${cert.workMode==='On-site'?'selected':''}>On-site</option>
          <option value="Hybrid" ${cert.workMode==='Hybrid'?'selected':''}>Hybrid</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input id="e-start" class="form-input" type="date" value="${esc(cert.startDate||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input id="e-end" class="form-input" type="date" value="${esc(cert.endDate||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Name</label>
        <input id="e-issuer-name" class="form-input" value="${esc(cert.issuerName||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Issuer Title</label>
        <input id="e-issuer-title" class="form-input" value="${esc(cert.issuerTitle||'')}" />
      </div>
      <div class="form-group form-full">
        <label class="form-label">Notes (Internal)</label>
        <textarea id="e-notes" class="form-textarea">${esc(cert.notes||'')}</textarea>
      </div>
      <div class="form-group form-full" style="border-top: 1px dashed var(--gray-200); padding-top: 12px; margin-top: 8px;">
        <label class="form-label">Upload Signed Copy <span style="font-size:0.7rem;color:#94a3b8;font-weight:400;">(optional, max 4MB PDF/Image)</span></label>
        <input type="file" id="e-signed-file" accept="application/pdf,image/*" class="form-input" style="padding:6px; background:#fff;" />
        ${cert.signedUrl ? `
          <div style="font-size:0.75rem; color:#166534; margin-top:6px; display:flex; align-items:center; gap:6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:6px 10px; width:fit-content;">
            <span>✅ Signed Copy Attached:</span>
            <a href="${cert.signedUrl}" target="_blank" style="color:#166534; font-weight:700; text-decoration:underline;">Download Copy</a>
          </div>
        ` : ''}
      </div>
    </div>
    <p id="edit-error" style="color:var(--red);font-size:0.8rem;margin-top:10px;min-height:18px;"></p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" id="cancel-edit">Cancel</button>
    <button class="btn-primary" id="submit-edit">Save Changes</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal('edit-modal'); });
  document.getElementById('close-edit-modal').addEventListener('click', () => closeModal('edit-modal'));
  document.getElementById('cancel-edit').addEventListener('click', () => closeModal('edit-modal'));
  document.getElementById('submit-edit').addEventListener('click', () => submitEdit(id));
}

async function submitEdit(id) {
  const get = (elId) => document.getElementById(elId)?.value?.trim() || '';
  const err = document.getElementById('edit-error');
  err.textContent = '';

  const name = get('e-name');
  const role = get('e-role');
  if (!name || !role) { err.textContent = 'Name and Role are required.'; return; }

  // Resolve product — if custom selected, use the text input
  const productSel = get('e-product');
  const product = productSel === '__custom__' ? get('e-product-custom') : productSel;

  const data = {
    id,
    holderName:        name,
    holderEmail:       get('e-email') || undefined,
    holderDob:         get('e-dob')   || undefined,
    holderInstitution: get('e-institution') || undefined,
    holderDepartment:  get('e-dept') || undefined,
    certificateType:   get('e-type') || undefined,
    role,
    product:           product || undefined,
    reportingTo:       get('e-reporting') || undefined,
    workMode:          get('e-workmode') || undefined,
    startDate:         get('e-start') || undefined,
    endDate:           get('e-end') || undefined,
    issuerName:        get('e-issuer-name') || undefined,
    issuerTitle:       get('e-issuer-title') || undefined,
    notes:             get('e-notes') || undefined,
  };

  const btn = document.getElementById('submit-edit');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    // 1. Save core fields first
    await adminUpdateCertificate(token, id, data);

    // 2. If a signed file is chosen, upload it
    const fileEl = document.getElementById('e-signed-file');
    const file = fileEl?.files?.[0];
    if (file) {
      btn.textContent = 'Uploading Signed Doc…';
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      
      const sizeMb = fileToUpload.size / (1024 * 1024);
      if (sizeMb > 4.0) {
        throw new Error(`File is too large (${sizeMb.toFixed(2)} MB). Max limit is 4MB.`);
      }

      await adminUploadSigned(token, id, fileToUpload);
    }

    closeModal('edit-modal');
    showToast('✅ Certificate updated successfully!', 'success');
    await loadData();
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVOKE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openRevokeModal(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'revoke-modal';
  overlay.innerHTML = `
<div class="modal-box" style="max-width:420px;">
  <div class="modal-header">
    <h2 class="modal-title">🚫 Revoke Certificate</h2>
    <button class="modal-close" id="close-revoke">✕</button>
  </div>
  <div class="modal-body">
    <p style="font-size:0.88rem;color:#475569;margin-bottom:16px;">
      You are about to revoke the certificate issued to <strong>${esc(name)}</strong>. This will immediately invalidate it on the public verification page.
    </p>
    <div class="form-group">
      <label class="form-label">Reason for Revocation (Optional)</label>
      <textarea id="revoke-reason" class="form-textarea" placeholder="e.g. Misconduct, Data breach, Incorrect issuance…" style="min-height:70px;"></textarea>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" id="cancel-revoke">Cancel</button>
    <button class="btn-danger" id="confirm-revoke">Revoke Certificate</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal('revoke-modal'); });
  document.getElementById('close-revoke').addEventListener('click',  () => closeModal('revoke-modal'));
  document.getElementById('cancel-revoke').addEventListener('click', () => closeModal('revoke-modal'));
  document.getElementById('confirm-revoke').addEventListener('click', async () => {
    const reason = document.getElementById('revoke-reason').value.trim();
    const btn = document.getElementById('confirm-revoke');
    btn.disabled = true;
    btn.textContent = 'Revoking…';
    try {
      await adminRevoke(token, id, reason || undefined);
      closeModal('revoke-modal');
      showToast('🚫 Certificate revoked.', 'error');
      await loadData();
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Revoke Certificate';
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openDeleteModal(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'delete-modal';
  overlay.innerHTML = `
<div class="modal-box" style="max-width:420px;">
  <div class="modal-header">
    <h2 class="modal-title">🗑 Delete Certificate</h2>
    <button class="modal-close" id="close-delete">✕</button>
  </div>
  <div class="modal-body">
    <p style="font-size:0.88rem;color:#475569;margin-bottom:12px;">
      You are about to <strong>permanently delete</strong> the certificate issued to
      <strong>${esc(name)}</strong>. This action <strong>cannot be undone</strong> and
      will remove all verification history for this record.
    </p>
    <p style="font-size:0.82rem;color:#dc2626;font-weight:600;">⚠️ This is irreversible. Are you sure?</p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" id="cancel-delete">Cancel</button>
    <button class="btn-danger" id="confirm-delete" style="background:#b91c1c;">Delete Permanently</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal('delete-modal'); });
  document.getElementById('close-delete').addEventListener('click',  () => closeModal('delete-modal'));
  document.getElementById('cancel-delete').addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    const btn = document.getElementById('confirm-delete');
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    try {
      await adminDeleteCertificate(token, id);
      closeModal('delete-modal');
      showToast('🗑 Certificate permanently deleted.', 'error');
      await loadData();
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Delete Permanently';
    }
  });
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.remove();
}

function showToast(msg, type = 'success') {
  const old = document.getElementById('ws-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'ws-toast';
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL GENERATOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
async function openEmailModal(certId) {
  const cert = allCerts.find(c => c.certificateId === certId);
  if (!cert) return showToast('❌ Certificate not found', 'error');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'email-modal';
  overlay.innerHTML = `
<div class="modal-box" style="max-width:400px;text-align:center;padding:40px;">
  <div class="spinner" style="margin:0 auto 16px;"></div>
  <p style="color:var(--navy);font-weight:600;">Fetching employee records details…</p>
</div>`;
  document.body.appendChild(overlay);

  let employees = [];
  try {
    employees = await adminGetEmployees(token);
  } catch {}

  let resolvedDob = cert.holderDob || '';
  let resolvedEmail = cert.holderEmail || '';

  if (cert.holderEmail) {
    const emp = employees.find(e => e.email?.toLowerCase() === cert.holderEmail.toLowerCase());
    if (emp) {
      if (!resolvedDob && emp.meta) {
        try {
          const meta = JSON.parse(emp.meta);
          if (meta.dob) resolvedDob = meta.dob;
        } catch {}
      }
      if (!resolvedEmail && emp.email) {
        resolvedEmail = emp.email;
      }
    }
  }

  // Pre-fill links
  const downloadLink = `${window.location.origin}/#download?ref=${encodeURIComponent(cert.referenceNumber)}`;
  const { subject, bodyText, bodyHtml } = generateEmailTemplate(cert, resolvedEmail, downloadLink);

  overlay.innerHTML = `
<div class="modal-box" style="max-width:720px; width:95%;">
  <div class="modal-header">
    <h2 class="modal-title">📧 Recipient Email Composer</h2>
    <button class="modal-close" onclick="document.getElementById('email-modal').remove()">✕</button>
  </div>
  <div class="modal-body" style="padding-bottom:12px;">
    
    <div style="background:rgba(13,27,62,0.02); border:1px solid var(--gray-200); border-radius:8px; padding:14px; margin-bottom:16px; display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem;">
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <strong style="min-width:60px;">To:</strong>
          <input id="m-to" class="form-input" style="flex:1; border:none; padding:4px 8px; font-size:0.88rem; background:transparent; font-weight:600; color:var(--navy);" value="${esc(resolvedEmail)}" placeholder="recipient@example.com" />
        </div>
        <button class="btn-primary" onclick="window.wsCopyInput('m-to', 'To Address')" style="padding:4px 8px; font-size:0.75rem;">📋 Copy</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; border-top: 1px dashed var(--gray-200); padding-top:6px;">
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <strong style="min-width:60px;">CC:</strong>
          <input id="m-cc" class="form-input" style="flex:1; border:none; padding:4px 8px; font-size:0.88rem; background:transparent; font-weight:600; color:var(--navy);" value="careers@waveseed.app" placeholder="e.g. HR copy" />
        </div>
        <button class="btn-primary" onclick="window.wsCopyInput('m-cc', 'CC Address')" style="padding:4px 8px; font-size:0.75rem;">📋 Copy</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; border-top: 1px dashed var(--gray-200); padding-top:6px;">
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <strong style="min-width:60px;">BCC:</strong>
          <input id="m-bcc" class="form-input" style="flex:1; border:none; padding:4px 8px; font-size:0.88rem; background:transparent; font-weight:600; color:var(--navy);" value="" placeholder="e.g. audit@waveseed.app, backup@waveseed.app" />
        </div>
        <button class="btn-primary" onclick="window.wsCopyInput('m-bcc', 'BCC Address')" style="padding:4px 8px; font-size:0.75rem;">📋 Copy</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; border-top: 1px dashed var(--gray-200); padding-top:6px;">
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <strong style="min-width:60px;">Subject:</strong>
          <input id="m-sub" class="form-input" style="flex:1; border:none; padding:4px 8px; font-size:0.88rem; background:transparent; font-weight:600; color:var(--navy);" value="${esc(subject)}" />
        </div>
        <button class="btn-primary" onclick="window.wsCopyInput('m-sub', 'Subject')" style="padding:4px 8px; font-size:0.75rem; white-space:nowrap;">📋 Copy</button>
      </div>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="gen-filter-tabs" style="margin-bottom:12px; display:flex; gap:6px;">
      <button class="gen-tab active" id="btn-tab-rich" style="padding:6px 14px; font-size:0.8rem;">Rich HTML Preview</button>
      <button class="gen-tab" id="btn-tab-plain" style="padding:6px 14px; font-size:0.8rem;">Plain Text Editor</button>
    </div>

    <!-- Rich HTML Display -->
    <div id="m-body-html" style="background:#fff; border:2px solid var(--gray-200); border-radius:10px; padding:20px; max-height:300px; overflow-y:auto; line-height:1.6; font-size:0.92rem; color:#334155; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      ${bodyHtml}
    </div>

    <!-- Plain Text Textarea -->
    <textarea id="m-body-text" class="form-textarea" style="display:none; font-family:monospace; font-size:0.85rem; height:300px; line-height:1.5; padding:12px; border:2px solid var(--gray-200); border-radius:10px;">${esc(bodyText)}</textarea>

  </div>
  <div class="modal-footer" style="display:flex; justify-content:space-between; gap:10px;">
    <div>
      <button class="btn-secondary" onclick="document.getElementById('email-modal').remove()">Close</button>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn-primary" id="btn-copy-rich" style="background:linear-gradient(135deg, var(--gold-dark), var(--gold)); border-color:var(--gold-dark);">
        📋 Copy Rich Body (for Gmail/Zoho)
      </button>
      <button class="btn-primary" id="btn-open-mail" style="background:var(--navy);">
        📧 Send Email
      </button>
    </div>
  </div>
</div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const tabRich = document.getElementById('btn-tab-rich');
  const tabPlain = document.getElementById('btn-tab-plain');
  const bodyHtmlEl = document.getElementById('m-body-html');
  const bodyTextEl = document.getElementById('m-body-text');

  tabRich.addEventListener('click', () => {
    tabRich.classList.add('active');
    tabPlain.classList.remove('active');
    bodyHtmlEl.style.display = 'block';
    bodyTextEl.style.display = 'none';
  });

  tabPlain.addEventListener('click', () => {
    tabPlain.classList.add('active');
    tabRich.classList.remove('active');
    bodyHtmlEl.style.display = 'none';
    bodyTextEl.style.display = 'block';
  });

  // Copy rich text
  document.getElementById('btn-copy-rich').addEventListener('click', () => {
    const textVal = bodyTextEl.value;
    const htmlVal = bodyHtmlEl.innerHTML;
    window.wsCopyRichEmailContent(htmlVal, textVal);
  });

  // Open mailto link
  document.getElementById('btn-open-mail').addEventListener('click', () => {
    const to = document.getElementById('m-to').value.trim();
    const cc = document.getElementById('m-cc').value.trim();
    const bcc = document.getElementById('m-bcc').value.trim();
    const sub = document.getElementById('m-sub').value.trim();
    const textVal = bodyTextEl.value;
    const mailto = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(textVal)}`;
    window.open(mailto, '_blank');
  });
}

function generateEmailTemplate(cert, email, downloadLink) {
  const fullName = cert.holderName || '';
  const role = cert.role || 'Intern';
  const product = cert.product || 'WaveBase AI';
  const startDate = cert.startDate ? formatDateShort(cert.startDate) : 'soon';
  const endDate = cert.endDate ? formatDateShort(cert.endDate) : 'completion';
  const ref = cert.referenceNumber;
  
  let subject = '';
  let bodyText = '';
  let bodyHtml = '';

  const onboardLink = `https://docs.google.com/forms/d/e/1FAIpQLSeIbX_sqZlWBtGyckesbLxvAUfxhqYgFBLP3tFtj-xskGS_qg/viewform`;

  if (cert.certificateType === 'internship-offer') {
    subject = `You're In! Internship Offer — ${role} | WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Congratulations! 🎉\n\n` +
      `On behalf of the entire team at WaveSeed Co., it gives me great pleasure to inform you that following your interview, you have been successfully selected for the position of ${role} at WaveSeed Co.\n\n` +
      `Your performance during the interview was truly impressive — you stood out for your passion, clarity of thought, and the depth of your understanding in AI & ML. We genuinely believe you are going to be an incredible addition to the WaveSeed family as we build ${product} together.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 NEXT STEPS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `1️⃣  Download Your Offer Letter\n` +
      `    👉 Internship Offer Letter to Download: ${downloadLink}\n\n` +
      `    Please read through the offer letter and the terms carefully.\n\n` +
      `2️⃣  Accept & Submit the Signed Offer\n` +
      `    Print, sign, and scan the offer letter, then submit it via the link below:\n` +
      `    👉 Submit Accepted Offer Letter: ${onboardLink}\n\n` +
      `    Kindly complete this at the earliest to confirm your seat.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `We are excited to have you on board starting ${startDate}. Expect an onboarding note from our team shortly after your acceptance is confirmed.\n\n` +
      `Once again — congratulations, ${fullName}! This is just the beginning of something great. We can't wait to build with you. 🚀\n\n` +
      `Warm regards & Best Wishes,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.\n` +
      `Indian Institute of Technology Patna.                                                                   Copy to: WaveSeed Careers.\n` +
      `📧 mahender@waveseed.app                                                                                                careers@waveseed.app\n` +
      `🌐 www.waveseed.app\n\n` +
      `─────────────────────────────────────────\n` +
      `This email and any attachments are strictly private and confidential.\n` +
      `Intended solely for the named recipient. If received in error, please notify us immediately.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Congratulations! 🎉</p>
      <p>On behalf of the entire team at <strong>WaveSeed Co.</strong>, it gives me great pleasure to inform you that following your interview, you have been successfully selected for the position of <strong>${esc(role)}</strong> at WaveSeed Co.</p>
      <p>Your performance during the interview was truly impressive — you stood out for your passion, clarity of thought, and the depth of your understanding in AI & ML. We genuinely believe you are going to be an incredible addition to the WaveSeed family as we build <strong>${esc(product)}</strong> together.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; font-family: inherit;">
        <h4 style="margin: 0 0 10px; color: #0d1b3e; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">📄 Next Steps</h4>
        <p style="margin: 5px 0 14px; font-size: 0.92rem;">
          <strong>1️⃣ Download Your Offer Letter</strong><br>
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Internship Offer Letter to Download</a><br>
          <span style="font-size: 0.8rem; color: #64748b;">Please read through the offer letter and the terms carefully.</span>
        </p>
        <p style="margin: 5px 0 0; font-size: 0.92rem;">
          <strong>2️⃣ Accept & Submit the Signed Offer</strong><br>
          Print, sign, and scan the offer letter, then submit it via the link below:<br>
          👉 <a href="${onboardLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Submit Accepted Offer Letter</a><br>
          <span style="font-size: 0.8rem; color: #64748b;">Kindly complete this at the earliest to confirm your seat.</span>
        </p>
      </div>
      <p>We are excited to have you on board starting <strong>${esc(startDate)}</strong>. Expect an onboarding note from our team shortly after your acceptance is confirmed.</p>
      <p>Once again — congratulations, ${esc(fullName)}! This is just the beginning of something great. We can't wait to build with you. 🚀</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Warm regards & Best Wishes,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.<br>
        Indian Institute of Technology Patna.<br>
        <span style="color:#94a3b8; font-size:0.75rem; float:right;">Copy to: WaveSeed Careers.</span>
        📧 <a href="mailto:mahender@waveseed.app" style="color: #0d1b3e;">mahender@waveseed.app</a> | <a href="mailto:careers@waveseed.app" style="color: #0d1b3e;">careers@waveseed.app</a><br>
        🌐 <a href="https://www.waveseed.app" style="color: #c9a227;">www.waveseed.app</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 10px;">
      <p style="font-size: 0.72rem; color: #94a3b8; line-height: 1.4;">
        This email and any attachments are strictly private and confidential. Intended solely for the named recipient. If received in error, please notify us immediately.
      </p>`;
  } else if (cert.certificateType === 'employment-offer') {
    subject = `Welcome to the Team! Employment Offer — ${role} | WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Congratulations! 🎉\n\n` +
      `On behalf of the entire team at WaveSeed Co., we are thrilled to offer you full-time employment as ${role}.\n\n` +
      `Your credentials, interview performance, and background stood out to us, and we are confident that you will make a huge impact as we build out our SaaS platforms.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 NEXT STEPS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `1️⃣  Download Your Offer Letter\n` +
      `    👉 Offer Letter to Download: ${downloadLink}\n\n` +
      `2️⃣  Accept & Submit the Signed Offer\n` +
      `    👉 Submit Signed Offer Letter: ${onboardLink}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Your joining date is scheduled for ${startDate}. We look forward to building great things together.\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Congratulations! 🎉</p>
      <p>On behalf of the entire team at <strong>WaveSeed Co.</strong>, we are thrilled to offer you full-time employment as <strong>${esc(role)}</strong>.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc;">
        <h4 style="margin: 0 0 10px; color: #0d1b3e; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">📄 Next Steps</h4>
        <p style="margin: 5px 0 12px; font-size: 0.92rem;">
          <strong>1️⃣ Download Your Offer Letter</strong><br>
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Click here to download your Offer Letter</a>
        </p>
        <p style="margin: 5px 0 0; font-size: 0.92rem;">
          <strong>2️⃣ Accept & Submit the Signed Offer</strong><br>
          👉 <a href="${onboardLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Submit Signed Offer Letter</a>
        </p>
      </div>
      <p>Your joining date is scheduled for <strong>${esc(startDate)}</strong>. We look forward to building great things together.</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'internship-cert') {
    subject = `Congratulations! Your WaveSeed Internship Certificate is Ready 🎓`;
    bodyText = `Dear ${fullName},\n\n` +
      `Congratulations on successfully completing your internship at WaveSeed Co.! 🎉\n\n` +
      `We are pleased to issue your official Internship Completion Certificate for your role as ${role} working on our ${product} initiatives.\n\n` +
      `You can view and download your verified certificate via the secure link below:\n` +
      `👉 ${downloadLink}\n\n` +
      `Thank you for your valuable contributions, hard work, and dedication. We wish you the absolute best in your future career goals!\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Congratulations on successfully completing your internship at <strong>WaveSeed Co.</strong>! 🎉</p>
      <p>We are pleased to issue your official Internship Completion Certificate for your role as <strong>${esc(role)}</strong> working on our <strong>${esc(product)}</strong> initiatives.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Your Internship Certificate</a>
        </p>
      </div>
      <p>Thank you for your valuable contributions, hard work, and dedication. We wish you the absolute best in your future career goals!</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'employment-cert') {
    subject = `Official Employment & Service Certificate — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Please find your official Employment Confirmation & Service Certificate issued by WaveSeed Co.\n\n` +
      `This document serves as formal proof of your service and designation as ${role}.\n\n` +
      `You can download your document securely here:\n` +
      `👉 ${downloadLink}\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Please find your official Employment Confirmation & Service Certificate issued by <strong>WaveSeed Co.</strong></p>
      <p>This document serves as formal proof of your service and designation as <strong>${esc(role)}</strong>.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Employment Certificate</a>
        </p>
      </div>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'experience-letter') {
    subject = `Official Experience & Service Letter — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Please find attached your official Experience & Service Verification Letter from WaveSeed Co.\n\n` +
      `This letter confirms your tenure as ${role} from ${startDate} to ${endDate}.\n\n` +
      `You can download the letter securely via this link:\n` +
      `👉 ${downloadLink}\n\n` +
      `We thank you for your service and wish you all the best in your future career endeavors.\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Please find attached your official Experience & Service Verification Letter from <strong>WaveSeed Co.</strong></p>
      <p>This letter confirms your tenure as <strong>${esc(role)}</strong> from <strong>${esc(startDate)}</strong> to <strong>${esc(endDate)}</strong>.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Experience Letter</a>
        </p>
      </div>
      <p>We thank you for your service and wish you all the best in your future career endeavors.</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'relieving-letter') {
    subject = `Relieving Letter & Service Confirmation — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `We are issuing your formal Relieving Letter confirming that you have been relieved of your duties as ${role} at WaveSeed Co. effective from the exit date.\n\n` +
      `All clearances and dues have been processed.\n\n` +
      `You can access and download your relieving letter here:\n` +
      `👉 ${downloadLink}\n\n` +
      `We wish you success in your future career path.\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>We are issuing your formal Relieving Letter confirming that you have been relieved of your duties as <strong>${esc(role)}</strong> at <strong>WaveSeed Co.</strong> effective from your exit date.</p>
      <p>All clearances and dues have been successfully processed.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Relieving Letter</a>
        </p>
      </div>
      <p>We wish you success in your future career path.</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'termination-letter') {
    subject = `Confidential: Separation & Termination Letter — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `This is a confidential notification regarding your separation from WaveSeed Co. Please review the official termination notice containing the terms of separation and final settlement.\n\n` +
      `You can download the notice here:\n` +
      `👉 ${downloadLink}\n\n` +
      `Please contact HR if you have any questions.\n\n` +
      `Best regards,\n\n` +
      `HR Department | WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>This is a confidential notification regarding your separation from <strong>WaveSeed Co.</strong> Please review the official termination notice containing the terms of separation and final settlement details.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #fef2f2; text-align: center; border: 1px solid #fecaca; border-radius: 8px;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #dc2626; font-weight: bold; text-decoration: underline;" target="_blank">Download Separation Notice</a>
        </p>
      </div>
      <p>Please contact HR if you have any questions.</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>HR Department</strong><br>
        WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'lor') {
    subject = `Letter of Recommendation — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Please find your official Letter of Recommendation (LOR) issued by Mahender Banoth at WaveSeed Co.\n\n` +
      `This letter highlights your strengths, achievements, and contributions as ${role}.\n\n` +
      `You can view and download your LOR securely here:\n` +
      `👉 ${downloadLink}\n\n` +
      `We hope this LOR assists you in your academic or professional endeavors. Best of luck!\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Please find your official Letter of Recommendation (LOR) issued by Mahender Banoth at <strong>WaveSeed Co.</strong></p>
      <p>This letter highlights your strengths, achievements, and contributions during your tenure as <strong>${esc(role)}</strong>.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Letter of Recommendation</a>
        </p>
      </div>
      <p>We hope this LOR assists you in your academic or professional endeavors. Best of luck!</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'noc') {
    subject = `No Objection Certificate (NOC) — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Please find attached your official No Objection Certificate (NOC) issued by WaveSeed Co.\n\n` +
      `You can access and download your NOC securely via this link:\n` +
      `👉 ${downloadLink}\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Please find attached your official No Objection Certificate (NOC) issued by <strong>WaveSeed Co.</strong></p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download No Objection Certificate</a>
        </p>
      </div>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'promotion-letter') {
    subject = `Congratulations on your Promotion! — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `We are absolutely delighted to issue your official Promotion Letter confirming your new role as ${role} at WaveSeed Co.\n\n` +
      `Thank you for your outstanding contributions and drive. You can download the details of your revised role and compensation terms here:\n` +
      `👉 ${downloadLink}\n\n` +
      `Congratulations on this well-deserved step up!\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>We are absolutely delighted to issue your official Promotion Letter confirming your new role as <strong>${esc(role)}</strong> at <strong>WaveSeed Co.</strong></p>
      <p>Thank you for your outstanding contributions and drive. You can download the details of your revised role and compensation terms here:</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Promotion Letter</a>
        </p>
      </div>
      <p>Congratulations on this well-deserved step up!</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'salary-revision') {
    subject = `Confidential: Salary Revision Letter — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `Please find attached your confidential Salary Revision Letter details confirming the adjustment of your compensation terms at WaveSeed Co.\n\n` +
      `You can download the document details securely here:\n` +
      `👉 ${downloadLink}\n\n` +
      `Best regards,\n\n` +
      `Mahender Banoth\n` +
      `Founder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Please find attached your confidential Salary Revision Letter details confirming the adjustment of your compensation terms at <strong>WaveSeed Co.</strong></p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Download Salary Revision Letter</a>
        </p>
      </div>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  } else if (cert.certificateType === 'warning-letter') {
    subject = `Confidential: Disciplinary Action / Warning Notice — WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `This is a confidential disciplinary warning notice regarding recent incidents. Please review the official notice containing details and required actions immediately.\n\n` +
      `You can download the notice securely here:\n` +
      `👉 ${downloadLink}\n\n` +
      `Please contact HR immediately to arrange a review meeting.\n\n` +
      `Best regards,\n\n` +
      `HR Department | WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>This is a confidential disciplinary warning notice regarding recent incidents. Please review the official notice containing details and required actions immediately.</p>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #fffbeb; border: 1px solid #fde68a; text-align: center; border-radius: 8px;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #b45309; font-weight: bold; text-decoration: underline;" target="_blank">Download Disciplinary Warning</a>
        </p>
      </div>
      <p>Please contact HR immediately to arrange a review meeting.</p>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>HR Department</strong><br>
        WaveSeed Co.
      </p>`;
  } else {
    subject = `Official Document Issued — ${getNiceTypeLabel(cert.certificateType)} | WaveSeed Co.`;
    bodyText = `Dear ${fullName},\n\n` +
      `An official document has been issued to you by WaveSeed Co.:\n` +
      `Type: ${getNiceTypeLabel(cert.certificateType)}\n` +
      `Reference: ${ref}\n\n` +
      `You can access and download your document securely via this link:\n` +
      `👉 ${downloadLink}\n\n` +
      `Best regards,\nMahender Banoth\nFounder, CEO & Building WaveSeed Co.`;

    bodyHtml = `<p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>An official document has been issued to you by <strong>WaveSeed Co.</strong>:</p>
      <ul>
        <li><strong>Document Type:</strong> ${esc(getNiceTypeLabel(cert.certificateType))}</li>
        <li><strong>Reference Number:</strong> ${esc(ref)}</li>
      </ul>
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 15px 0; background: #f8fafc; text-align: center;">
        <p style="margin: 5px 0; font-size: 1rem;">
          👉 <a href="${downloadLink}" style="color: #c9a227; font-weight: bold; text-decoration: underline;" target="_blank">Access Your Official Document</a>
        </p>
      </div>
      <p style="margin-top: 24px; line-height: 1.5; font-size: 0.92rem;">
        Best regards,<br><br>
        <strong>Mahender Banoth</strong><br>
        Founder, CEO & Building WaveSeed Co.
      </p>`;
  }

  return { subject, bodyText, bodyHtml };
}

window.wsCopyInput = (id, label) => {
  const el = document.getElementById(id);
  if (!el) return;
  const val = el.value.trim();
  navigator.clipboard.writeText(val).then(() => {
    showToast(`✅ ${label} copied to clipboard!`, 'success');
  });
};

window.wsCopyText = (id, label) => {
  const text = document.getElementById(id).innerText || document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✅ ${label} copied to clipboard!`, 'success');
  });
};

window.wsCopyRichEmailContent = (html, text) => {
  try {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([text], { type: 'text/plain' });
    const item = new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText
    });
    navigator.clipboard.write([item]).then(() => {
      showToast('📋 Rich email body copied! You can paste it directly into Gmail, Zoho Mail, or Outlook.', 'success');
    }).catch(() => {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Plain text body copied (Rich copy blocked by browser).', 'success');
      });
    });
  } catch (e) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Plain text body copied.', 'success');
    });
  }
};


