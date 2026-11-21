// ─── reports.js — cross-business overview (parent-level view) ─────────────────
import { adminGetEmployees, adminGetAll, adminGetDocSummary } from '../api.js';
import { loadBusinessList, bizOf } from '../utils/businesses.js';
import { slotsFor, requirementProgress } from '../utils/docCatalog.js';

let data = null;   // { businesses, employees, certs, summary }

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Businesses in tree order: parent, then its ventures (indented)
function orderedBusinesses(list) {
  const out = [];
  const walk = (parentId, depth) => {
    list.filter(b => (b.parentId || null) === parentId).forEach(b => { out.push({ ...b, depth }); walk(b.id, depth + 1); });
  };
  walk(null, 0);
  return out;
}

function progressOf(emp) {
  const uploaded = new Set((data.summary[emp._id] || []).map(d => d.docType));
  return requirementProgress(slotsFor(emp.employeeType), t => uploaded.has(t));
}

function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

// ─── Entry ─────────────────────────────────────────────────────────────────────
export async function initReportsPage(mainEl, token) {
  mainEl.innerHTML = `
<div class="admin-topbar">
  <div>
    <div class="admin-page-title">📊 Reports</div>
    <div class="admin-page-subtitle">All businesses at a glance: people, certificates and document completeness.</div>
  </div>
</div>
<div class="admin-content">
<div id="reports-body"><div class="stat-card" style="padding:28px;text-align:center;"><div class="spinner" style="margin:0 auto 10px;"></div>Loading…</div></div>
</div>`;

  try {
    const [businesses, employees, certs, summary] = await Promise.all([
      loadBusinessList(token),
      adminGetEmployees(token),
      adminGetAll(token),
      adminGetDocSummary(token).catch(() => ({})),
    ]);
    data = { businesses, employees, certs: Array.isArray(certs) ? certs : (certs.certificates || []), summary };
    render();
  } catch (err) {
    document.getElementById('reports-body').innerHTML = `<div class="stat-card" style="padding:24px;color:var(--red);">❌ Could not load reports: ${esc(err.message)}</div>`;
  }
}

// ─── Rendering ─────────────────────────────────────────────────────────────────
function render() {
  const { businesses, employees, certs } = data;
  const rows = orderedBusinesses(businesses);

  const stat = (b) => {
    const people = employees.filter(e => bizOf(businesses, e.businessId)?.id === b.id);
    const cs = certs.filter(c => bizOf(businesses, c.businessId)?.id === b.id);
    const active = people.filter(p => p.status !== 'former');
    const complete = active.filter(p => { const pr = progressOf(p); return pr.done === pr.total; }).length;
    return {
      interns: people.filter(p => p.employeeType === 'intern').length,
      employees: people.filter(p => p.employeeType !== 'intern').length,
      active: active.length,
      certs: cs.length,
      certActive: cs.filter(c => c.status === 'active').length,
      certOther: cs.filter(c => c.status !== 'active').length,
      complete, incomplete: active.length - complete,
    };
  };

  const stats = rows.map(b => ({ b, s: stat(b) }));
  const total = stats.reduce((t, { s }) => { for (const k in s) t[k] = (t[k] || 0) + s[k]; return t; }, {});

  const th = t => `<th style="text-align:${t === 'Business' ? 'left' : 'center'};">${t}</th>`;
  const td = v => `<td style="text-align:center;font-weight:600;color:var(--navy);">${v}</td>`;
  const line = (name, code, s, depth, bold) => `
<tr style="${bold ? 'background:var(--gray-100);font-weight:800;' : ''}">
  <td style="padding-left:${14 + depth * 20}px;">
    <span style="font-weight:700;color:var(--navy);">${esc(name)}</span>
    ${code ? `<span style="font-family:monospace;font-size:0.72rem;color:var(--gold-dark);margin-left:6px;">${esc(code)}</span>` : ''}
  </td>
  ${td(s.interns)}${td(s.employees)}${td(s.active)}${td(s.certs)}${td(s.certActive)}${td(s.certOther)}
  ${td(`<span style="color:#15803d;">${s.complete}</span>`)}${td(`<span style="color:${s.incomplete ? '#b45309' : 'var(--gray-400)'};">${s.incomplete}</span>`)}
</tr>`;

  const el = document.getElementById('reports-body');
  el.innerHTML = `
<div class="table-wrap" style="margin-bottom:22px;overflow-x:auto;">
  <table class="cert-table">
    <thead><tr>${th('Business')}${th('Interns')}${th('Employees')}${th('Active people')}${th('Certificates & letters')}${th('Active')}${th('Revoked / expired')}${th('Documents complete')}${th('Documents incomplete')}</tr></thead>
    <tbody>
      ${stats.map(({ b, s }) => line(b.displayName, b.code, s, b.depth, false)).join('')}
      ${stats.length > 1 ? line('All businesses', '', total, 0, true) : ''}
    </tbody>
  </table>
</div>

<div class="stat-card" style="padding:18px;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
    <div>
      <div style="font-weight:700;color:var(--navy);">⚠ Pending documents</div>
      <div style="font-size:0.78rem;color:var(--gray-500);">Active people who have not submitted every required document.</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <select id="rep-biz" class="filter-select">
        <option value="">All Businesses</option>
        ${businesses.filter(b => b.active).map(b => `<option value="${esc(b.id)}">${esc(b.displayName)} (${esc(b.code)})</option>`).join('')}
      </select>
      <button class="btn-secondary" id="rep-csv" style="padding:8px 14px;font-size:0.82rem;">⬇ Export CSV</button>
    </div>
  </div>
  <div id="rep-pending" style="overflow-x:auto;"></div>
</div>`;

  document.getElementById('rep-biz').addEventListener('change', renderPending);
  document.getElementById('rep-csv').addEventListener('click', exportCsv);
  renderPending();
}

function pendingList() {
  const bizId = document.getElementById('rep-biz')?.value || '';
  return data.employees
    .filter(e => e.status !== 'former')
    .filter(e => !bizId || bizOf(data.businesses, e.businessId)?.id === bizId)
    .map(e => ({ e, p: progressOf(e), biz: bizOf(data.businesses, e.businessId) }))
    .filter(x => x.p.done < x.p.total)
    .sort((a, b) => (a.p.done / a.p.total) - (b.p.done / b.p.total));
}

function renderPending() {
  const list = pendingList();
  const el = document.getElementById('rep-pending');
  if (!list.length) { el.innerHTML = '<div style="padding:18px;text-align:center;color:#15803d;font-weight:600;">✅ Nobody has pending documents.</div>'; return; }
  el.innerHTML = `
<table class="cert-table">
  <thead><tr><th>Person</th><th>Business</th><th>Type</th><th style="text-align:center;">Progress</th><th>Missing</th></tr></thead>
  <tbody>
    ${list.map(({ e, p, biz }) => `
    <tr>
      <td><div class="td-name">${esc(e.name)}</div><div style="font-size:0.72rem;font-family:monospace;color:var(--gold-dark);">${esc(e.empCode || 'ID not assigned')}</div></td>
      <td>${esc(biz ? biz.code : '—')}</td>
      <td>${e.employeeType === 'intern' ? 'Intern' : 'Employee'}</td>
      <td style="text-align:center;font-weight:700;color:#b45309;">${p.done}/${p.total}</td>
      <td style="font-size:0.78rem;color:var(--gray-600);">${esc(p.missing.join(' · '))}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
}

function exportCsv() {
  const list = pendingList();
  const head = ['Name', 'ID', 'Business', 'Type', 'Email', 'Done', 'Total', 'Missing'];
  const lines = [head.map(csvCell).join(',')].concat(list.map(({ e, p, biz }) =>
    [e.name, e.empCode || '', biz ? biz.code : '', e.employeeType, e.email || '', p.done, p.total, p.missing.join('; ')].map(csvCell).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pending-documents-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
