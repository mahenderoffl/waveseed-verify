// ─── employees.js — Employees Management Workspace ────────────────────────────
import {
  adminGetEmployees, adminAddEmployee, adminDeleteEmployee,
  adminGetDocuments, adminDeleteDocument, adminVerifyDocument,
  adminGetDocSummary, adminOpenDocument, adminGetDocLog, adminGetAll, adminGetBusinesses,
} from '../api.js';
import { productDropdownHTML, tableSkeletonHTML } from './shared.js';
import { loadBusinessList, bizBadge, fillBusinessFilter, matchesBusiness, productsOf } from '../utils/businesses.js';
import { productOptionsHTML } from './shared.js';
import { DOC_TYPES, GROUPS, slotsFor, requirementProgress } from '../utils/docCatalog.js';


let employeesList = [];
let bizList = [];       // businesses, for the Business column / filter
let docSummary = {};   // employeeId -> [{ docType, verified }]

// Document completeness for one person: { done, total, missing }
function docProgress(emp) {
  const uploaded = new Set((docSummary[emp._id] || []).map(d => d.docType));
  return requirementProgress(slotsFor(emp.employeeType), t => uploaded.has(t));
}

export async function initEmployeesPage(mainEl, token) {
  mainEl.innerHTML = buildEmployeesHTML();
  attachEmployeesEvents(mainEl, token);
  await loadEmployees(token);
}

// ─── HTML Template ─────────────────────────────────────────────────────────────
function buildEmployeesHTML() {
  return `
<div class="admin-topbar">
  <div>
    <div class="admin-page-title">👥 Employee & Intern Directory</div>
    <div class="admin-page-subtitle">Add and manage profiles of interns and employees to quickly issue documents</div>
  </div>
  <div>
    <button class="btn-add-cert" id="btn-add-employee">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Profile
    </button>
  </div>
</div>

<div class="admin-content">
  <!-- Search/Filters -->
  <div class="table-toolbar">
    <div class="search-input-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input id="emp-search" class="admin-search" type="text" placeholder="Search by name, ID, role, institution…" />
    </div>
    <select id="emp-filter-type" class="filter-select">
      <option value="">All Types</option>
      <option value="intern">Interns</option>
      <option value="employee">Employees</option>
    </select>
    <select id="emp-filter-biz" class="filter-select" style="display:none;"><option value="">All Businesses</option></select>
    <select id="emp-filter-docs" class="filter-select">
      <option value="">Documents: All</option>
      <option value="incomplete">⚠ Incomplete documents</option>
      <option value="complete">✅ Complete documents</option>
    </select>
  </div>

  <!-- Employees Table -->
  <div class="table-wrap">
    <table class="cert-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role / Project</th>
          <th>Contact</th>
          <th>Type</th>
          <th>Business</th>
          <th>Institution / Department</th>
          <th>Tenure</th>
          <th>Documents</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="emp-tbody">
        <tr><td colspan="9" class="empty-table"><div class="spinner" style="margin:0 auto 10px;"></div><p>Loading directory…</p></td></tr>
      </tbody>
    </table>
  </div>
</div>`;
}

// ─── Events ────────────────────────────────────────────────────────────────────
function attachEmployeesEvents(mainEl, token) {
  // Add Employee Button
  document.getElementById('btn-add-employee').addEventListener('click', () => openAddEmployeeModal(token));

  // Search/Filters
  document.getElementById('emp-search').addEventListener('input', () => renderEmployeesTable(token));
  document.getElementById('emp-filter-type').addEventListener('change', () => renderEmployeesTable(token));
  document.getElementById('emp-filter-docs').addEventListener('change', () => renderEmployeesTable(token));
  document.getElementById('emp-filter-biz').addEventListener('change', () => renderEmployeesTable(token));
}

// ─── Load Data ─────────────────────────────────────────────────────────────────
async function loadEmployees(token) {
  const tbody = document.getElementById('emp-tbody');
  if (tbody) {
    tbody.innerHTML = tableSkeletonHTML(9, 5);
  }
  try {
    employeesList = await adminGetEmployees(token);
    try { docSummary = await adminGetDocSummary(token); } catch { docSummary = {}; }
    bizList = await loadBusinessList(token);
    fillBusinessFilter(document.getElementById('emp-filter-biz'), bizList);
    renderEmployeesTable(token);
  } catch (err) {
    console.error('loadEmployees error:', err);
    if (err.message === 'Unauthorized') {
      sessionStorage.removeItem('ws_admin_token');
      sessionStorage.removeItem('ws_admin_role');
      window.location.reload();
      return;
    }
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="error-fallback-box">
              <h3>⚠️ Unable to Load Profiles</h3>
              <p>Could not connect to the employee directory database. Please check your connection and try again.</p>
              <button class="btn-primary" onclick="window.location.reload()" style="padding: 8px 16px; font-size: 0.85rem; width: auto; max-width: 150px; margin: 0 auto;">Retry Connection</button>
            </div>
          </td>
        </tr>`;
    }
    showToast('❌ Connection error. Failed to retrieve employee records.', 'error');
  }
}

// ─── Render Table ──────────────────────────────────────────────────────────────
function renderEmployeesTable(token) {
  const query = (document.getElementById('emp-search')?.value || '').toLowerCase();
  const typeF = document.getElementById('emp-filter-type')?.value || '';

  const filtered = employeesList.filter(emp => {
    const matchQ = !query || [emp.name, emp.empCode, emp.role, emp.institution, emp.department, emp.email]
      .join(' ').toLowerCase().includes(query);
    const matchT = !typeF || emp.employeeType === typeF;
    const docF = document.getElementById('emp-filter-docs')?.value || '';
    const p = docProgress(emp);
    const matchD = !docF || (docF === 'incomplete' ? p.done < p.total : p.done === p.total);
    const matchB = matchesBusiness(bizList, emp.businessId, document.getElementById('emp-filter-biz')?.value || '');
    return matchQ && matchT && matchD && matchB;
  });

  const tbody = document.getElementById('emp-tbody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-table"><div class="empty-icon">👥</div><p>No profiles found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(emp => {
    // Parse meta JSON for extended fields
    let meta = {};
    try { const m = emp.meta ? JSON.parse(emp.meta) : null; if (m && typeof m === 'object') meta = m; } catch {}
    const phone = meta.phone || '';
    const dob   = meta.dob   || '';
    return `
<tr>
  <td>
    <div class="td-name">${esc(emp.name)}</div>
    <div style="font-size:0.72rem;font-weight:700;letter-spacing:.03em;color:var(--gold-dark);margin-top:2px;font-family:monospace;">${emp.empCode ? esc(emp.empCode) : '<span style="color:var(--gray-400);font-weight:400;">ID not assigned</span>'}</div>
    <div style="font-size:0.7rem;color:var(--gray-400);margin-top:2px;">Work Mode: ${esc(emp.workMode || '—')}</div>
  </td>
  <td>
    <div class="td-role">${esc(emp.role)}</div>
    <div style="font-size:0.72rem;color:var(--gray-400);">${esc(emp.product || '—')}</div>
  </td>
  <td>
    <div style="font-size:0.8rem;color:var(--navy);">${phone ? `<a href="tel:${esc(phone)}" style="color:var(--navy);text-decoration:none;">${esc(phone)}</a>` : '—'}</div>
    <div style="font-size:0.72rem;color:var(--gray-400);margin-top:2px;">${esc(emp.email || '—')}</div>
    ${dob ? `<div style="font-size:0.7rem;color:var(--gray-400);margin-top:1px;">DOB: ${formatDateShort(dob)}</div>` : ''}
  </td>
  <td><span class="type-pill ${emp.employeeType === 'intern' ? 'internship' : 'employment'}">${emp.employeeType === 'intern' ? 'Intern' : 'Employee'}</span></td>
  <td>${bizBadge(bizList, emp.businessId)}</td>
  <td>
    <div style="font-size:0.8rem;font-weight:600;color:var(--navy);">${esc(emp.institution || '—')}</div>
    <div style="font-size:0.72rem;color:var(--gray-400);">${esc(emp.department || '—')}</div>
  </td>
  <td style="font-size:0.78rem;white-space:nowrap;">
    ${emp.startDate ? formatDateShort(emp.startDate) : '—'} <br>to ${emp.endDate ? formatDateShort(emp.endDate) : 'Present'}
  </td>
  <td>${(() => { const p = docProgress(emp); const ok = p.done === p.total;
    return `<button class="btn-action" title="${esc(ok ? 'All required documents received' : 'Missing: ' + p.missing.join(', '))}" onclick="window.wsViewEmpDocs('${emp._id}')" style="font-weight:700;color:${ok ? '#15803d' : '#b45309'};background:${ok ? '#f0fdf4' : '#fffbeb'};border:1px solid ${ok ? '#86efac' : '#fde68a'};">${ok ? '✅' : '⚠'} ${p.done}/${p.total}</button>`; })()}</td>
  <td>
    <div class="actions-cell">
      <button class="btn-action view" onclick="window.wsViewEmpProfile('${emp._id}')">👁 Profile</button>
      <button class="btn-action view" onclick="window.wsIssueFromEmp('${emp._id}')">🎓 Issue Cert</button>
      <button class="btn-action delete" onclick="window.wsDeleteEmp('${emp._id}')">✕ Delete</button>
    </div>
  </td>
</tr>`;
  }).join('');
}


// ─── Modal ─────────────────────────────────────────────────────────────────────
function openAddEmployeeModal(token) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-emp-modal';
  overlay.innerHTML = `
<div class="modal-box">
  <div class="modal-header">
    <h2 class="modal-title">👥 Add Employee/Intern Profile</h2>
    <button class="modal-close" onclick="document.getElementById('add-emp-modal').remove()">✕</button>
  </div>
  <div class="modal-body">
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Full Name <span class="req">*</span></label>
        <input id="emp-f-name" class="form-input" placeholder="e.g. John Doe" />
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input id="emp-f-email" class="form-input" type="email" placeholder="e.g. johndoe@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Profile Type <span class="req">*</span></label>
        <select id="emp-f-type" class="form-select">
          <option value="intern">Intern</option>
          <option value="employee">Employee</option>
        </select>
      </div>
      <div class="form-group" id="emp-biz-group" style="display:none;">
        <label class="form-label">Business <span class="req">*</span></label>
        <select id="emp-f-business" class="form-select"></select>
        <div style="font-size:0.72rem;color:var(--gray-500);margin-top:3px;">Decides the ID prefix (e.g. WSG-INT-…) and letterhead.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Role / Designation <span class="req">*</span></label>
        <input id="emp-f-role" class="form-input" placeholder="AI Full Stack Developer Intern" />
      </div>
      <div class="form-group">
        <label class="form-label">Project / Product Name</label>
        ${productDropdownHTML('emp-f-product')}
      </div>
      <div class="form-group">
        <label class="form-label">Work Mode</label>
        <select id="emp-f-workmode" class="form-select">
          <option value="Remote">Remote</option>
          <option value="On-site">On-site</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Institution / College</label>
        <input id="emp-f-institution" class="form-input" placeholder="Samskruti College of Engineering" />
      </div>
      <div class="form-group">
        <label class="form-label">Department / Branch</label>
        <input id="emp-f-dept" class="form-input" placeholder="e.g. Artificial Intelligence (CSM)" />
      </div>
      <div class="form-group">
        <label class="form-label">Reporting Manager</label>
        <input id="emp-f-reporting" class="form-input" placeholder="e.g. Chief Developer, WaveSeed Co." />
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input id="emp-f-start" class="form-input" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input id="emp-f-end" class="form-input" type="date" />
      </div>
    </div>
    <p id="emp-add-error" style="color:var(--red);font-size:0.8rem;margin-top:10px;min-height:18px;"></p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="document.getElementById('add-emp-modal').remove()">Cancel</button>
    <button class="btn-primary" id="emp-submit-btn">Save Profile</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Business picker (only shown when there is more than one active business)
  (async () => {
    try {
      const { businesses } = await adminGetBusinesses(token);
      const active = businesses.filter(b => b.active);
      const parent = active.find(b => !b.parentId);
      const setProducts = (businessId) => {
        const ps = document.getElementById('emp-f-product');
        if (ps) ps.innerHTML = productOptionsHTML(productsOf(businesses, businessId), '');
      };
      if (parent) setProducts(parent.id);
      const sel = document.getElementById('emp-f-business');
      if (!sel || active.length < 2) return;
      sel.innerHTML = active.map(b => `<option value="${esc(b.id)}" ${parent && b.id === parent.id ? 'selected' : ''}>${esc(b.displayName)} (${esc(b.code)})</option>`).join('');
      sel.addEventListener('change', () => setProducts(sel.value));
      document.getElementById('emp-biz-group').style.display = '';
    } catch { /* single-business fallback: server defaults to the parent company */ }
  })();

  document.getElementById('emp-submit-btn').addEventListener('click', async () => {
    const name = document.getElementById('emp-f-name').value.trim();
    const email = document.getElementById('emp-f-email').value.trim();
    const type = document.getElementById('emp-f-type').value;
    const role = document.getElementById('emp-f-role').value.trim();
    const productSel = document.getElementById('emp-f-product').value;
    const product = productSel === '__custom__'
      ? document.getElementById('emp-f-product-custom').value.trim()
      : productSel;
    const workMode = document.getElementById('emp-f-workmode').value;
    const institution = document.getElementById('emp-f-institution').value.trim();
    const dept = document.getElementById('emp-f-dept').value.trim();
    const reporting = document.getElementById('emp-f-reporting').value.trim();
    const start = document.getElementById('emp-f-start').value;
    const end = document.getElementById('emp-f-end').value;

    const err = document.getElementById('emp-add-error');
    err.textContent = '';

    if (!name || !role) {
      err.textContent = 'Please fill out all required fields (*).';
      return;
    }

    const btn = document.getElementById('emp-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      await adminAddEmployee(token, {
        businessId: document.getElementById('emp-f-business')?.value || undefined,
        name,
        email: email || undefined,
        employeeType: type,
        role,
        product: product || undefined,
        workMode: workMode || undefined,
        institution: institution || undefined,
        department: dept || undefined,
        reportingTo: reporting || undefined,
        startDate: start || undefined,
        endDate: end || undefined,
      });
      overlay.remove();
      showToast('✅ Employee profile saved successfully!', 'success');
      await loadEmployees(token);
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });
}

// ─── Actions ───────────────────────────────────────────────────────────────────
window.wsDeleteEmp = async (id) => {
  const name = employeesList.find(e => e._id === id)?.name || 'this';
  if (!confirm(`Are you sure you want to delete ${name}'s profile?`)) return;
  const token = sessionStorage.getItem('ws_admin_token');
  try {
    await adminDeleteEmployee(token, id);
    showToast('🗑️ Profile deleted.', 'error');
    employeesList = employeesList.filter(e => e._id !== id);
    document.getElementById('emp-search').dispatchEvent(new Event('input'));
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
};

// ─── Full Profile Viewer ────────────────────────────────────────────────────────
window.wsViewEmpProfile = (id) => {
  const emp = employeesList.find(e => e._id === id);
  if (!emp) return;

  let meta = {};
  try { const m = emp.meta ? JSON.parse(emp.meta) : null; if (m && typeof m === 'object') meta = m; } catch {}

  const row = (label, value) => value
    ? `<div class="prof-row"><span class="prof-label">${label}</span><span class="prof-value">${esc(String(value))}</span></div>`
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'profile-modal';
  overlay.innerHTML = `
<div class="modal-box" style="max-width:560px;">
  <div class="modal-header">
    <h2 class="modal-title">👤 ${esc(emp.name)}</h2>
    <button class="modal-close" onclick="document.getElementById('profile-modal').remove()">✕</button>
  </div>
  <div class="modal-body" style="padding-bottom:8px;">

    <div class="prof-section-title">🏷️ Work Info</div>
    ${row(emp.employeeType === 'intern' ? 'Intern ID' : 'Employee ID', emp.empCode || 'Not assigned (created before IDs were introduced)')}
    ${row('Role', emp.role)}
    ${row('Project / Product', emp.product)}
    ${row('Work Mode', emp.workMode)}
    ${row('Reporting To', emp.reportingTo)}
    ${row('Type', emp.employeeType === 'intern' ? 'Intern' : 'Employee')}
    ${row('Start Date', emp.startDate ? formatDateShort(emp.startDate) : null)}
    ${row('End Date', emp.endDate ? formatDateShort(emp.endDate) : 'Present')}

    <div class="prof-section-title" style="margin-top:16px;">📋 Personal Details</div>
    ${row('Email', emp.email)}
    ${row('Phone', meta.phone)}
    ${row('Date of Birth', meta.dob ? formatDateShort(meta.dob) : null)}
    ${row('Gender', meta.gender)}
    ${row('Address', meta.address)}

    <div class="prof-section-title" style="margin-top:16px;">🎓 Academic Background</div>
    ${row('Institution', emp.institution)}
    ${row('Department', emp.department)}
    ${row('Degree', meta.degree)}
    ${row('Graduation Year', meta.gradYear)}
    ${row('CGPA / Percentage', meta.gpa)}

    ${meta.previouslyEmployed ? `
    <div class="prof-section-title" style="margin-top:16px;">💼 Previous Employment</div>
    ${row('Previous Employer', meta.prevEmployer)}
    ${row('Designation', meta.prevDesignation)}
    ${row('Period', [meta.prevFrom, meta.prevTo].filter(Boolean).join(' → '))}
    ${row('Responsibilities', meta.prevResponsibilities)}
    ${row('Reason for Leaving', meta.prevReasonLeaving)}
    ` : ''}

    <div class="prof-section-title" style="margin-top:16px;">🎓 Certificates &amp; Letters Issued</div>
    <div id="prof-certs" style="font-size:0.82rem;color:var(--gray-500);">Loading…</div>

    ${meta.notes ? `
    <div class="prof-section-title" style="margin-top:16px;">📝 Notes</div>
    <div style="font-size:0.85rem;color:var(--gray-600);line-height:1.6;background:var(--gray-100);padding:10px 12px;border-radius:8px;">${esc(meta.notes)}</div>
    ` : ''}
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="document.getElementById('profile-modal').remove()">Close</button>
    <button class="btn-secondary" onclick="document.getElementById('profile-modal').remove(); window.wsViewEmpDocs('${emp._id}')">📁 Documents</button>
    <button class="btn-primary" onclick="document.getElementById('profile-modal').remove(); window.wsIssueFromEmp('${emp._id}')">🎓 Issue Certificate</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Certificates linked to this person
  (async () => {
    const el = document.getElementById('prof-certs');
    try {
      const token = sessionStorage.getItem('ws_admin_token');
      const all = await adminGetAll(token);
      const list = (Array.isArray(all) ? all : (all.certificates || [])).filter(c => c.employeeId === id);
      if (!el) return;
      el.innerHTML = list.length
        ? list.map(c => `<div style="padding:5px 0;border-bottom:1px solid var(--gray-100);color:var(--gray-800);"><strong>${esc(c.certificateId)}</strong> · ${esc(c.certificateType)} · ${esc(c.issuedDate || '')}${c.status && c.status !== 'active' ? ' · <span style="color:var(--red);">' + esc(c.status) + '</span>' : ''}</div>`).join('')
        : 'None linked yet.';
    } catch { if (el) el.textContent = 'Could not load certificates.'; }
  })();
};

window.wsIssueFromEmp = (id) => {
  const emp = employeesList.find(e => e._id === id);
  if (!emp) return;

  // Soft gate: warn (not block) when required documents are missing
  const p = docProgress(emp);
  if (p.done < p.total &&
      !confirm(`${emp.name} has not submitted all required documents (${p.done}/${p.total}).\n\nMissing:\n• ${p.missing.join('\n• ')}\n\nIssue the certificate anyway?`)) {
    return;
  }

  // Closes the current modal if open
  document.getElementById('add-emp-modal')?.remove();

  // Switches navigation to certificates view and triggers add cert modal
  document.getElementById('nav-certs')?.click();

  // Wait for cert screen to render
  setTimeout(() => {
    const addBtn = document.getElementById('btn-add');
    if (addBtn) {
      addBtn.click();
      setTimeout(() => {
        const select = document.getElementById('cert-emp-select');
        if (select) {
          select.value = id;
          select.dispatchEvent(new Event('change'));
        }
      }, 100);
    }
  }, 100);
};

// ─── Documents Viewer ──────────────────────────────────────────────────────────

window.wsViewEmpDocs = async (id) => {
  const emp = employeesList.find(e => e._id === id);
  if (!emp) return;
  const token = sessionStorage.getItem('ws_admin_token');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'docs-modal';
  overlay.innerHTML = `
<div class="modal-box" style="max-width:640px;max-height:90vh;overflow:auto;">
  <div class="modal-header">
    <h2 class="modal-title">📁 Documents — ${esc(emp.name)}${emp.empCode ? ` <span style="font-size:0.8rem;font-family:monospace;color:var(--gold-dark);">${esc(emp.empCode)}</span>` : ''}</h2>
    <button class="modal-close" onclick="document.getElementById('docs-modal').remove()">✕</button>
  </div>
  <div class="modal-body" id="docs-modal-body">
    <div style="text-align:center;padding:32px;color:var(--gray-400);">
      <div class="spinner" style="margin:0 auto 12px;"></div>Loading documents…
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="document.getElementById('docs-modal').remove()">Close</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const body = document.getElementById('docs-modal-body');

  try {
    const { documents } = await adminGetDocuments(token, id);

    const slots = slotsFor(emp.employeeType);
    const byType = Object.fromEntries(documents.map(d => [d.docType, d]));
    const prog = requirementProgress(slots, t => !!byType[t]);
    const verifiedCount = documents.filter(d => d.verified).length;
    // Uploads under types not in this person's list (e.g. older uploads)
    const extra = documents.filter(d => !slots.some(s => s.type === d.docType));

    const row = (label, d, required, oneOf) => d ? `
<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid ${d.verified ? '#86efac' : 'var(--gray-200)'};border-radius:8px;padding:10px 14px;margin-bottom:6px;background:${d.verified ? '#f0fdf4' : '#fafafa'};gap:10px;flex-wrap:wrap;">
  <div>
    <div style="font-weight:600;color:var(--navy);font-size:0.88rem;">✅ ${esc(label)}${d.verified ? ' <span style="color:#16a34a;font-size:0.75rem;">· Verified</span>' : ''}</div>
    <div style="font-size:0.76rem;color:var(--gray-500);margin-top:2px;">${esc(d.fileName)} · ${fmtBytes(d.sizeBytes)} · ${formatDateShort(new Date(d.uploadedAt).toISOString().slice(0,10))}</div>
  </div>
  <div style="display:flex;gap:6px;align-items:center;">
    <button class="btn-action view" onclick="window._wsOpenDoc('${d.id}')">👁 View</button>
    <button class="btn-action" onclick="window._wsVerifyDoc('${d.id}',${!d.verified},'${id}')">${d.verified ? '↩ Unverify' : '✔ Verify'}</button>
    <button class="btn-action delete" onclick="window._wsDeleteDoc('${d.id}','${id}')">🗑</button>
  </div>
</div>` : `
<div style="display:flex;align-items:center;border:1px dashed var(--gray-200);border-radius:8px;padding:8px 14px;margin-bottom:6px;color:var(--gray-500);font-size:0.85rem;">
  ${required ? '❌' : '⬜'} ${esc(label)} <span style="margin-left:6px;font-size:0.75rem;">${required ? '(required — missing)' : oneOf ? '(any one required)' : '(not uploaded)'}</span>
</div>`;

    const groupTitle = t => `<div style="font-size:0.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-600);margin:16px 0 8px;">${t}</div>`;

    body.innerHTML = `
<div style="font-size:0.85rem;color:var(--gray-600);margin-bottom:6px;font-weight:600;">
  Required: ${prog.done}/${prog.total} · Uploaded: ${documents.length} · Verified: ${verifiedCount}
</div>
${prog.missing.length ? `<div style="font-size:0.8rem;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-bottom:6px;">⚠ Missing: ${esc(prog.missing.join(' · '))}</div>` : '<div style="font-size:0.8rem;color:#16a34a;margin-bottom:6px;">✅ All required documents received</div>'}
${documents.length ? '' : '<p style="font-size:0.82rem;color:var(--gray-500);margin-bottom:8px;">Nothing uploaded yet. Ask the person to open the <strong>#upload</strong> page on the verification site with their Reference Number and Date of Birth.</p>'}
${GROUPS.map(g => {
  const items = slots.filter(s => s.group === g.id);
  return items.length ? groupTitle(g.title) + items.map(s => row(s.label, byType[s.type], s.required, s.oneOf)).join('') : '';
}).join('')}
${groupTitle('🔒 Access log')}<div id="docs-log" style="font-size:0.78rem;color:var(--gray-500);">Loading…</div>
${extra.length ? groupTitle('Other') + extra.map(d => row(DOC_TYPES[d.docType]?.label || d.docType, d, false)).join('') : ''}`;

    // Access log (admin / HR only)
    try {
      const logs = await adminGetDocLog(token, id);
      const ACTIONS = { view_list: 'opened the documents list', view_file: 'opened', verify: 'verified', unverify: 'removed verification of', delete: 'deleted' };
      document.getElementById('docs-log').innerHTML = logs.length
        ? logs.slice(0, 15).map(l => `<div style="padding:3px 0;border-bottom:1px solid var(--gray-100);">${new Date(l.at).toLocaleString('en-IN')} · <strong>${esc(l.role)}</strong> ${ACTIONS[l.action] || esc(l.action)}${l.docType ? ' ' + esc(DOC_TYPES[l.docType]?.label || l.docType) : ''}</div>`).join('')
        : 'No access recorded yet.';
    } catch { const el = document.getElementById('docs-log'); if (el) el.textContent = 'Access log is visible to admin / HR only.'; }

  } catch (e) {
    body.innerHTML = `<p style="color:var(--red);padding:16px;">❌ Failed to load documents: ${esc(e.message)}</p>`;
  }
};

function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

window._wsOpenDoc = async (docId) => {
  const token = sessionStorage.getItem('ws_admin_token');
  const w = window.open('', '_blank');   // open synchronously so popup blockers allow it
  try {
    const url = await adminOpenDocument(token, docId);
    if (w) { w.opener = null; w.location.href = url; } else window.location.href = url;
  } catch (err) {
    if (w) w.close();
    showToast('❌ ' + err.message, 'error');
  }
};

window._wsVerifyDoc = async (docId, verified, empId) => {
  const token = sessionStorage.getItem('ws_admin_token');
  try {
    await adminVerifyDocument(token, docId, verified);
    document.getElementById('docs-modal')?.remove();
    window.wsViewEmpDocs(empId);
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

window._wsDeleteDoc = async (docId, empId) => {
  if (!confirm('Delete this document? This cannot be undone.')) return;
  const token = sessionStorage.getItem('ws_admin_token');
  try {
    await adminDeleteDocument(token, docId);
    showToast('🗑️ Document deleted.', 'error');
    // Refresh docs modal
    document.getElementById('docs-modal')?.remove();
    window.wsViewEmpDocs(empId);
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(msg, type='success') {
  const old = document.getElementById('ws-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'ws-toast';
  t.className = `toast ${type}`;
  t.innerHTML = `<span></span>`;
  t.firstElementChild.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
