// ─── admin.js — Admin Dashboard ────────────────────────────────────────────────
import {
  adminLogin, adminGetStats, adminGetAll,
  adminAddCertificate, adminRevoke, adminRestore, adminSeed, adminDeleteCertificate,
  adminGetEmployees, adminGetNextIds
} from '../api.js';
import { initGeneratePage } from './generate.js';
import { initEmployeesPage } from './employees.js';

let token = sessionStorage.getItem('ws_admin_token') || null;
let currentRole = sessionStorage.getItem('ws_admin_role') || 'admin';
let allCerts = [];
let statsData = {};

export function initAdminPage(app) {
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
  app.innerHTML = buildDashboardHTML();
  attachDashboardEvents(app);
  await loadData();
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
  document.getElementById('btn-logout').addEventListener('click', () => {
    token = null;
    currentRole = 'admin';
    sessionStorage.removeItem('ws_admin_token');
    sessionStorage.removeItem('ws_admin_role');
    renderLogin(app);
  });

  // Add certificate
  document.getElementById('btn-add').addEventListener('click', () => openAddModal());

  // Seed
  document.getElementById('btn-seed').addEventListener('click', async () => {
    const btn = document.getElementById('btn-seed');
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
  document.getElementById('nav-verify').addEventListener('click', () => {
    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
  });

  // Generate Docs
  document.getElementById('nav-generate').addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-generate').classList.add('active');
    const mainEl = document.querySelector('.admin-main');
    mainEl.innerHTML = '';
    initGeneratePage(mainEl, token);
  });

  // Directory
  document.getElementById('nav-employees').addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-employees').classList.add('active');
    const mainEl = document.querySelector('.admin-main');
    mainEl.innerHTML = '';
    initEmployeesPage(mainEl, token);
  });

  // Back to Certificates from Generate / Directory
  document.getElementById('nav-certs').addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-certs').classList.add('active');
    renderDashboard(app);
  });

  // Filters
  document.getElementById('admin-search').addEventListener('input', renderTable);
  document.getElementById('filter-type').addEventListener('change', renderTable);
  document.getElementById('filter-status').addEventListener('change', renderTable);
}

// ─── Data Loading ──────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [certs, stats] = await Promise.all([
      adminGetAll(token),
      adminGetStats(token),
    ]);
    allCerts = certs;
    statsData = stats;
    renderStats(stats);
    renderTable();
  } catch {
    showToast('❌ Session expired. Please log in again.', 'error');
    setTimeout(() => { token = null; sessionStorage.removeItem('ws_admin_token'); }, 2000);
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

  tbody.innerHTML = filtered.map(c => `
<tr>
  <td><div class="td-cert-id">${esc(c.certificateId)}</div><div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">${esc(c.referenceNumber)}</div></td>
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
      <button class="btn-action view" onclick="window.wsViewCert('${esc(c.certificateId)}')">🔍 View</button>
      ${c.status === 'active'
        ? `<button class="btn-action revoke" onclick="window.wsRevokeModal('${c._id}','${esc(c.holderName)}')">🚫 Revoke</button>`
        : `<button class="btn-action restore" onclick="window.wsRestore('${c._id}')">↩ Restore</button>`
      }
      <button class="btn-action delete" onclick="window.wsDeleteModal('${c._id}','${esc(c.holderName)}')">🗑 Delete</button>
    </div>
  </td>
</tr>`).join('');
}

// Expose handlers on window for inline onclick (no framework)
window.wsViewCert = (certId) => {
  window.open(`/?id=${certId}`, '_blank');
};

window.wsRevokeModal = (id, name) => openRevokeModal(id, name);

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
        <input id="f-product" class="form-input" placeholder="e.g. WaveBase AI" />
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
    product:           get('f-product') || undefined,
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
