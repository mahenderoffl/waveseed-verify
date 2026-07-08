// ─── employees.js — Employees Management Workspace ────────────────────────────
import {
  adminGetEmployees, adminAddEmployee, adminDeleteEmployee
} from '../api.js';
import { productDropdownHTML, tableSkeletonHTML } from './shared.js';


let employeesList = [];

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
      <input id="emp-search" class="admin-search" type="text" placeholder="Search profiles by name, role, institution…" />
    </div>
    <select id="emp-filter-type" class="filter-select">
      <option value="">All Types</option>
      <option value="intern">Interns</option>
      <option value="employee">Employees</option>
    </select>
  </div>

  <!-- Employees Table -->
  <div class="table-wrap">
    <table class="cert-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role / Project</th>
          <th>Email</th>
          <th>Type</th>
          <th>Institution / Department</th>
          <th>Reporting To</th>
          <th>Tenure</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="emp-tbody">
        <tr><td colspan="8" class="empty-table"><div class="spinner" style="margin:0 auto 10px;"></div><p>Loading directory…</p></td></tr>
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
}

// ─── Load Data ─────────────────────────────────────────────────────────────────
async function loadEmployees(token) {
  const tbody = document.getElementById('emp-tbody');
  if (tbody) {
    tbody.innerHTML = tableSkeletonHTML(8, 5);
  }
  try {
    employeesList = await adminGetEmployees(token);
    renderEmployeesTable(token);
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
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
    const matchQ = !query || [emp.name, emp.role, emp.institution, emp.department, emp.email]
      .join(' ').toLowerCase().includes(query);
    const matchT = !typeF || emp.employeeType === typeF;
    return matchQ && matchT;
  });

  const tbody = document.getElementById('emp-tbody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-table"><div class="empty-icon">👥</div><p>No profiles found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(emp => `
<tr>
  <td><div class="td-name">${esc(emp.name)}</div><div style="font-size:0.7rem;color:var(--gray-400);margin-top:2px;">Work Mode: ${esc(emp.workMode || '—')}</div></td>
  <td><div class="td-role">${esc(emp.role)}</div><div style="font-size:0.72rem;color:var(--gray-400);">${esc(emp.product || '—')}</div></td>
  <td><a href="mailto:${esc(emp.email)}" style="color:var(--navy);font-size:0.8rem;text-decoration:none;">${esc(emp.email || '—')}</a></td>
  <td><span class="type-pill ${emp.employeeType === 'intern' ? 'internship' : 'employment'}">${emp.employeeType === 'intern' ? 'Intern' : 'Employee'}</span></td>
  <td>
    <div style="font-size:0.8rem;font-weight:600;color:var(--navy);">${esc(emp.institution || '—')}</div>
    <div style="font-size:0.72rem;color:var(--gray-400);">${esc(emp.department || '—')}</div>
  </td>
  <td><div style="font-size:0.8rem;color:var(--gray-600);">${esc(emp.reportingTo || '—')}</div></td>
  <td style="font-size:0.78rem;white-space:nowrap;">
    ${emp.startDate ? formatDateShort(emp.startDate) : '—'} <br>to ${emp.endDate ? formatDateShort(emp.endDate) : '—'}
  </td>
  <td>
    <div class="actions-cell">
      <button class="btn-action view" onclick="window.wsIssueFromEmp('${emp._id}')">🎓 Issue Cert</button>
      <button class="btn-action delete" onclick="window.wsDeleteEmp('${emp._id}','${esc(emp.name)}')">✕ Delete</button>
    </div>
  </td>
</tr>`).join('');
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
window.wsDeleteEmp = async (id, name) => {
  if (!confirm(`Are you sure you want to delete ${name}'s profile?`)) return;
  const token = sessionStorage.getItem('ws_admin_token');
  try {
    await adminDeleteEmployee(token, id);
    showToast('🗑️ Profile deleted.', 'error');
    // Reload local list
    employeesList = employeesList.filter(e => e._id !== id);
    document.getElementById('emp-search').dispatchEvent(new Event('input'));
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
};

window.wsIssueFromEmp = (id) => {
  const emp = employeesList.find(e => e._id === id);
  if (!emp) return;

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

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

function showToast(msg, type='success') {
  const old = document.getElementById('ws-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'ws-toast';
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
