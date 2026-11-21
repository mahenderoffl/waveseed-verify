// ─── person.js — everything about one person on one page ──────────────────────
// Overview · Documents (checklist, view, verify, ZIP) · Certificates · Activity
import { icon } from '../../ui/icons.js';
import { esc, avatar, badge, button, empty, kpi, openModal, onAction, fmtDate, timeAgo, skeletonRows } from '../../ui/components.js';
import { DOC_TYPES, GROUPS, slotsFor } from '../../utils/docCatalog.js';
import {
  adminGetDocuments, adminOpenDocument, adminVerifyDocument, adminDeleteDocument, adminGetDocLog,
  adminUpdateEmployee, adminDeleteEmployee,
} from '../../api.js';
import { businessOf, progressOf, data as store, invalidate, load } from '../state.js';
import { href } from '../router.js';

const CERT_LABELS = {
  'internship-cert': 'Internship certificate', 'employment-cert': 'Employment certificate', 'course-cert': 'Course certificate',
  'appreciation-cert': 'Appreciation certificate', 'achievement-cert': 'Achievement certificate', 'volunteer-cert': 'Volunteer certificate',
  'internship-offer': 'Internship offer', 'employment-offer': 'Employment offer', 'experience-letter': 'Experience letter',
  'relieving-letter': 'Relieving letter', 'termination-letter': 'Termination letter', lor: 'Recommendation letter', noc: 'NOC',
  'promotion-letter': 'Promotion letter', 'salary-revision': 'Salary revision', 'salary-slip': 'Salary slip', 'salary-certificate': 'Salary certificate',
  'warning-letter': 'Warning notice', internship: 'Internship certificate', employment: 'Employment certificate', course: 'Course certificate',
};
const certLabel = (t) => CERT_LABELS[t] || String(t || 'Document').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const fmtBytes = (b) => !b ? '—' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
const LOG_ACTIONS = { view_list: 'opened the documents list', view_file: 'opened', verify: 'verified', unverify: 'removed verification of', delete: 'deleted' };

function parseMeta(emp) { try { const m = emp.meta ? JSON.parse(emp.meta) : null; return m && typeof m === 'object' ? m : {}; } catch { return {}; } }

export default async function mount(el, ctx) {
  const emp = store.employees.find(e => e._id === ctx.id);
  if (!emp) {
    el.innerHTML = `<div class="card">${empty({ icon: 'user', title: 'Person not found', text: 'They may have been removed.', action: button('Back to people', { href: href('people'), icon: 'arrow-left', variant: 'primary' }) })}</div>`;
    return;
  }
  const meta = parseMeta(emp);
  const biz = businessOf(emp.businessId);
  const slots = slotsFor(emp.employeeType);
  const canKyc = ctx.can.kyc;
  const myCerts = store.certs.filter(c => c.employeeId === emp._id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let tab = 'overview';
  let docs = null;          // loaded lazily (admin / HR only)
  let docsError = '';
  let log = null;
  let alive = true;

  // Offers issued to this person and what they answered (newest answer wins; an acceptance is final)
  const OFFER = new Set(['internship-offer', 'employment-offer']);
  const myOffers = myCerts.filter(c => OFFER.has(c.certificateType) && c.status !== 'revoked');
  const recFor = (c) => {
    const rows = (store.acceptances || []).filter(a => a.certificateDocId === c._id).sort((a, b) => b.acceptedAt - a.acceptedAt);
    return rows.find(r => r.decision === 'accepted') || rows[0] || null;
  };
  const IST = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
  const fmtWhen = (ms) => new Date(ms).toLocaleString('en-IN', IST) + ' IST';
  const acceptUrl = (c) => 'https://verify.waveseed.app/#accept?ref=' + encodeURIComponent(c.referenceNumber);

  const uploadedTypes = () => new Set(docs ? docs.map(d => d.docType) : (store.summary[emp._id] || []).map(d => d.docType));
  const prog = () => progressOf(emp);

  // ── Header ─────────────────────────────────────────────────────────────────
  const p0 = prog();
  const header = `
  <div class="card person-head">
    <div class="person-id">
      ${avatar(emp.name, 'xl')}
      <div class="grow" style="min-width:0">
        <div class="row wrap gap-2" style="margin-bottom:6px">
          ${badge(emp.employeeType === 'intern' ? 'Intern' : 'Employee', { variant: emp.employeeType === 'intern' ? 'teal' : 'violet' })}
          ${biz ? badge(biz.displayName, { variant: 'gold' }) : ''}
          ${badge(emp.status === 'former' ? 'Former' : 'Active', { variant: emp.status === 'former' ? '' : 'green', dot: true })}
        </div>
        <h2 class="person-name">${esc(emp.name)}</h2>
        <div class="muted">${esc([emp.role, emp.product].filter(Boolean).join(' · ') || 'No role set')}</div>
        <div class="row wrap gap-4 person-contact">
          ${emp.empCode ? `<span class="mono strong">${icon('id-card', { size: 15 })} ${esc(emp.empCode)}</span>` : `<span class="muted">${icon('id-card', { size: 15 })} ID not assigned</span>`}
          ${emp.email ? `<span>${icon('mail', { size: 15 })} ${esc(emp.email)}</span>` : ''}
          ${meta.phone ? `<span>${icon('phone', { size: 15 })} ${esc(meta.phone)}</span>` : ''}
          ${emp.institution ? `<span>${icon('graduation-cap', { size: 15 })} ${esc(emp.institution)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="person-actions">
      ${ctx.can.create ? button('Issue document', { variant: 'primary', icon: 'file-plus', href: `${href('create')}?person=${encodeURIComponent(emp._id)}` }) : ''}
      ${ctx.role === 'admin' || ctx.role === 'hr' ? button('Edit', { icon: 'pencil', action: 'edit' }) : ''}
      ${ctx.role === 'admin' || ctx.role === 'hr' ? button('', { iconOnly: true, icon: 'trash', variant: 'danger', title: 'Delete person', action: 'delete-person' }) : ''}
    </div>
  </div>
  <div class="tabs" role="tablist" id="ptabs" style="margin:22px 0 20px"></div>
  <div id="pbody"></div>`;

  el.innerHTML = header;

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const renderTabs = () => {
    const p = prog();
    const tabs = [['overview', 'user', 'Overview'], ['documents', 'files', `Documents <span class="badge ${p.done === p.total ? 'badge--green' : 'badge--amber'}" style="margin-left:4px">${p.done}/${p.total}</span>`], ['certificates', 'award', `Certificates <span class="badge" style="margin-left:4px">${myCerts.length}</span>`], ['activity', 'history', 'Activity']];
    el.querySelector('#ptabs').innerHTML = tabs.map(([id, ic, label]) => `<button class="tab" role="tab" data-action="tab" data-tab="${id}" aria-selected="${tab === id}">${icon(ic, { size: 17 })}${label}</button>`).join('');
  };

  const kv = (label, value) => value ? `<div class="kv"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>` : '';

  const overview = () => {
    const p = prog();
    const pct = p.total ? Math.round(p.done / p.total * 100) : 100;
    const tenure = emp.startDate ? `${fmtDate(emp.startDate)} → ${emp.endDate ? fmtDate(emp.endDate) : 'Present'}` : '';
    return `
    <div class="person-grid">
      <section class="card card-pad">
        <div class="card-title" style="margin-bottom:14px">${icon('user', { size: 18 })} Profile</div>
        <dl class="kvs">
          ${kv('Full name', emp.name)}${kv('Email', emp.email)}${kv('Phone', meta.phone)}${kv('Date of birth', meta.dob ? fmtDate(meta.dob) : '')}${kv('Gender', meta.gender)}${kv('Address', meta.address)}
          ${kv('Institution', emp.institution)}${kv('Department', emp.department)}${kv('Degree', meta.degree)}${kv('Graduation year', meta.gradYear)}${kv('Score', meta.gpa)}
          ${kv('Role', emp.role)}${kv('Project / product', emp.product)}${kv('Work mode', emp.workMode)}${kv('Reporting to', emp.reportingTo)}${kv('Tenure', tenure)}
        </dl>
        ${meta.notes ? `<div class="callout callout--blue" style="margin-top:16px">${icon('message', { size: 18 })}<div>${esc(meta.notes)}</div></div>` : ''}
      </section>
      <div class="col" style="gap:20px;align-content:start">
        ${acceptanceCard()}
        <section class="card card-pad">
          <div class="row between"><div class="card-title">${icon('file-check', { size: 18 })} Documents</div><b class="tnum" style="font-size:20px">${pct}%</b></div>
          <div class="progress" style="margin:12px 0"><i style="width:${pct}%"></i></div>
          ${p.missing.length ? `<div class="callout callout--amber" style="margin-bottom:12px">${icon('alert-triangle', { size: 18 })}<div><b>Still missing</b><br>${esc(p.missing.join(' · '))}</div></div>` : `<div class="callout callout--green" style="margin-bottom:12px">${icon('circle-check', { size: 18 })}<div>All required documents received.</div></div>`}
          ${button('Open documents', { size: 'sm', icon: 'files', action: 'goto-docs' })}
        </section>
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:10px">${icon('award', { size: 18 })} Latest documents</div>
          ${myCerts.length ? myCerts.slice(0, 3).map(c => `<div class="row" style="padding:8px 0;border-top:1px solid var(--line)"><span class="chip-icon chip-icon--violet" style="width:34px;height:34px">${icon('file-text', { size: 17 })}</span><div class="grow"><b style="font-weight:600">${esc(certLabel(c.certificateType))}</b><div class="muted mono" style="font-size:12px">${esc(c.certificateId)}</div></div><span class="muted" style="font-size:12.5px">${esc(fmtDate(c.issuedDate))}</span></div>`).join('') : `<div class="muted">Nothing issued to ${esc(emp.name.split(' ')[0])} yet.</div>`}
        </section>
      </div>
    </div>`;
  };

  const acceptanceCard = () => {
    if (!myOffers.length) return '';
    const block = (c) => {
      const r = recFor(c);
      const state = !r ? 'pending' : r.decision === 'accepted' ? 'accepted' : 'declined';
      const geo = !r ? '' : r.geoStatus === 'granted' && r.geoLat != null
        ? `<a href="https://www.openstreetmap.org/?mlat=${r.geoLat}&mlon=${r.geoLon}#map=16/${r.geoLat}/${r.geoLon}" target="_blank" rel="noopener noreferrer">${r.geoLat.toFixed(4)}, ${r.geoLon.toFixed(4)}</a>${r.geoAccuracyM != null ? ` (±${Math.round(r.geoAccuracyM)} m)` : ''}`
        : ({ denied: 'Declined by the candidate', unavailable: 'Not available', not_requested: 'Not requested', granted: 'Shared' }[r.geoStatus] || '');
      const head = state === 'accepted' ? badge(r.method === 'electronic' ? 'Accepted · e-signed' : 'Accepted · signed copy', { variant: 'green', icon: 'badge-check' })
        : state === 'declined' ? badge('Declined', { variant: 'rose' }) : badge('Awaiting response', { variant: 'amber', dot: true });
      return `<div style="padding:12px 0;border-top:1px solid var(--line)">
        <div class="row between wrap gap-2"><div><b>${esc(certLabel(c.certificateType))}</b> <span class="muted mono" style="font-size:12px">${esc(c.certificateId)}</span></div>${head}</div>
        ${r ? `<dl class="kvs" style="margin-top:10px">
          ${kv('When', fmtWhen(r.acceptedAt))}
          ${r.signedName && r.method === 'electronic' ? kv('Signed as', r.signedName) : ''}
          ${kv('Receipt', r.receiptId)}
          ${r.ip ? kv('IP address', r.ip) : ''}
          ${r.method === 'electronic' ? `<div class="kv"><dt>Location</dt><dd>${geo}</dd></div>` : ''}
          ${r.userAgent ? kv('Device', r.userAgent.slice(0, 90)) : ''}
          ${r.reason ? kv('Reason', r.reason) : ''}
        </dl>` : `<div class="muted" style="margin-top:6px;font-size:13px">No response yet. Share the acceptance link with ${esc(emp.name.split(' ')[0])}.</div>`}
        <div class="row wrap gap-2" style="margin-top:10px">
          ${state === 'accepted' && r.method === 'electronic' ? button('Signed copy', { size: 'sm', icon: 'download', action: 'signed-copy', attrs: `data-id="${esc(c._id)}"` }) : ''}
          ${state === 'accepted' && r.signedFileUrl ? `<a class="btn btn--sm" href="${esc(r.signedFileUrl)}" target="_blank" rel="noopener noreferrer">${icon('paperclip', { size: 15 })} Uploaded copy</a>` : ''}
          ${state !== 'accepted' ? button('Copy acceptance link', { size: 'sm', icon: 'link', action: 'copy-accept', attrs: `data-id="${esc(c._id)}"` }) : ''}
        </div></div>`;
    };
    return `<section class="card card-pad">
      <div class="card-title">${icon('signature', { size: 18 })} Offer acceptance</div>
      ${myOffers.map(block).join('')}
    </section>`;
  };

  const documentsTab = () => {
    const have = new Map((docs || []).map(d => [d.docType, d]));
    const up = uploadedTypes();
    const row = (s) => {
      const d = have.get(s.type);
      const got = up.has(s.type);
      const status = got ? (d?.verified ? 'verified' : 'received') : (s.required ? 'missing' : 'optional');
      const ic = { verified: ['badge-check', 'green'], received: ['circle-check', 'blue'], missing: ['circle-x', 'rose'], optional: ['circle-plus', ''] }[status];
      return `<div class="doc-row doc-row--${status}">
        <span class="chip-icon chip-icon--${ic[1] || 'navy'}" style="width:38px;height:38px;border-radius:11px">${icon(ic[0], { size: 19 })}</span>
        <div class="grow" style="min-width:0">
          <div class="strong">${esc(s.label)} ${s.required ? '' : `<span class="muted" style="font-weight:500;font-size:12px">${s.oneOf ? 'any one required' : 'optional'}</span>`}</div>
          <div class="muted truncate" style="font-size:12.5px">${d ? `${esc(d.fileName)} · ${fmtBytes(d.sizeBytes)} · ${esc(fmtDate(d.uploadedAt))}` : esc(s.hint || '')}</div>
        </div>
        ${status === 'verified' ? badge('Verified', { variant: 'green', icon: 'badge-check' }) : status === 'received' ? badge('Awaiting review', { variant: 'blue' }) : status === 'missing' ? badge('Missing', { variant: 'rose' }) : ''}
        ${d && canKyc ? `<div class="row gap-2">
          ${button('View', { size: 'sm', icon: 'eye', action: 'view-doc', attrs: `data-id="${esc(d.id)}"` })}
          ${button(d.verified ? 'Unverify' : 'Verify', { size: 'sm', variant: d.verified ? '' : 'primary', icon: d.verified ? 'restore' : 'check', action: 'verify-doc', attrs: `data-id="${esc(d.id)}" data-v="${d.verified ? 0 : 1}"` })}
          ${button('', { size: 'sm', iconOnly: true, variant: 'ghost', icon: 'trash', title: 'Delete document', action: 'delete-doc', attrs: `data-id="${esc(d.id)}"` })}
        </div>` : ''}
      </div>`;
    };
    if (canKyc && docs === null && !docsError) return `<div class="card card-pad">${skeletonRows(5, 58)}</div>`;
    return `
      ${!canKyc ? `<div class="callout callout--blue" style="margin-bottom:16px">${icon('lock', { size: 18 })}<div>Your role can see whether documents were received, but not open them. Only admin and HR can view KYC files.</div></div>` : ''}
      ${docsError ? `<div class="callout callout--rose" style="margin-bottom:16px">${icon('alert-triangle', { size: 18 })}<div>${esc(docsError)}</div></div>` : ''}
      ${canKyc && docs && docs.length ? `<div class="row between wrap" style="margin-bottom:14px"><div class="muted">${docs.length} uploaded · ${docs.filter(d => d.verified).length} verified</div>${button('Download all (ZIP)', { size: 'sm', icon: 'file-down', action: 'zip' })}</div>` : ''}
      ${GROUPS.map(g => { const items = slots.filter(s => s.group === g.id); return items.length ? `<div class="doc-group"><div class="doc-group-title">${esc(g.title.replace(/^[^\w]+/, ''))}</div><div class="card">${items.map(row).join('')}</div></div>` : ''; }).join('')}
      ${docs ? docs.filter(d => !slots.some(s => s.type === d.docType)).map(d => `<div class="card doc-row">${icon('paperclip')}<div class="grow">${esc(DOC_TYPES[d.docType]?.label || d.docType)} · ${esc(d.fileName)}</div></div>`).join('') : ''}`;
  };

  const certsTab = () => myCerts.length ? `<div class="card"><div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Document</th><th>ID</th><th>Issued</th><th>Status</th><th>Verified</th><th></th></tr></thead><tbody>
    ${myCerts.map(c => `<tr><td><b style="font-weight:600">${esc(certLabel(c.certificateType))}</b>${OFFER.has(c.certificateType) ? (() => { const r = recFor(c); return ' ' + (r ? (r.decision === 'accepted' ? badge('Accepted', { variant: 'green' }) : badge('Declined', { variant: 'rose' })) : badge('Awaiting response', { variant: 'amber' })); })() : ''}${c.role ? `<div class="muted" style="font-size:12.5px">${esc(c.role)}</div>` : ''}</td>
      <td class="mono" style="font-size:12.5px">${esc(c.certificateId)}</td><td>${esc(fmtDate(c.issuedDate))}</td>
      <td>${badge(c.status === 'active' ? 'Active' : c.status === 'revoked' ? 'Revoked' : 'Expired', { variant: c.status === 'active' ? 'green' : c.status === 'revoked' ? 'rose' : 'amber', dot: true })}</td>
      <td class="tnum">${Number(c.verificationCount) || 0}×</td>
      <td style="text-align:right">${button('Open', { size: 'sm', icon: 'external-link', action: 'open-cert', attrs: `data-id="${esc(c._id)}"` })}</td></tr>`).join('')}
    </tbody></table></div></div>` : `<div class="card">${empty({ icon: 'award', tone: 'violet', title: 'No documents issued yet', text: `Certificates and letters issued to ${emp.name} will appear here.`, action: ctx.can.create ? button('Issue a document', { variant: 'primary', icon: 'file-plus', href: `${href('create')}?person=${encodeURIComponent(emp._id)}` }) : '' })}</div>`;

  const activityTab = () => {
    const items = [];
    myCerts.forEach(c => items.push({ at: c.createdAt || 0, tone: 'violet', icon: 'award', text: `<b>${esc(certLabel(c.certificateType))}</b> issued`, sub: c.certificateId }));
    (store.acceptances || []).filter(a => myCerts.some(c => c._id === a.certificateDocId)).forEach(a => items.push({ at: a.acceptedAt, tone: a.decision === 'accepted' ? 'green' : 'rose', icon: a.decision === 'accepted' ? 'signature' : 'x', text: a.decision === 'accepted' ? `Offer <b>accepted</b> ${a.method === 'electronic' ? 'electronically' : 'with a signed copy'}` : 'Offer <b>declined</b>', sub: a.receiptId }));
    (store.summary[emp._id] || []).forEach(d => d.at && items.push({ at: d.at, tone: 'teal', icon: 'cloud-upload', text: `Uploaded <b>${esc(DOC_TYPES[d.docType]?.label || d.docType)}</b>`, sub: d.verified ? 'Verified' : 'Awaiting review' }));
    (log || []).forEach(l => items.push({ at: l.at, tone: 'navy', icon: 'lock', text: `<b>${esc(l.role)}</b> ${esc(LOG_ACTIONS[l.action] || l.action)}${l.docType ? ' ' + esc(DOC_TYPES[l.docType]?.label || l.docType) : ''}`, sub: 'Access log' }));
    if (emp.createdAt) items.push({ at: emp.createdAt, tone: 'green', icon: 'user-plus', text: 'Profile created', sub: emp.empCode || '' });
    items.sort((a, b) => b.at - a.at);
    return `<div class="card"><div class="timeline" style="padding:8px 0">${items.length ? items.map(a => `<div class="tl-item"><span class="tl-dot chip-icon--${a.tone}">${icon(a.icon, { size: 16 })}</span><div class="tl-main">${a.text}<small>${esc(a.sub)} · ${esc(timeAgo(a.at))} · ${esc(fmtDate(a.at))}</small></div></div>`).join('') : empty({ icon: 'history', title: 'No activity yet' })}</div></div>${canKyc && log === null ? '' : ''}`;
  };

  const paint = () => {
    if (!alive) return;
    renderTabs();
    const body = el.querySelector('#pbody');
    body.innerHTML = tab === 'overview' ? overview() : tab === 'documents' ? documentsTab() : tab === 'certificates' ? certsTab() : activityTab();
  };

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadDocs() {
    if (!canKyc) return;
    try { docs = (await adminGetDocuments(ctx.token, emp._id)).documents || []; docsError = ''; }
    catch (e) { docs = []; docsError = 'Could not load the uploaded files. ' + (e.message || ''); }
    paint();
  }
  async function loadLog() {
    if (!canKyc) { log = []; return; }
    try { log = await adminGetDocLog(ctx.token, emp._id); } catch { log = []; }
    if (tab === 'activity') paint();
  }
  loadDocs(); loadLog();

  // ── Actions ────────────────────────────────────────────────────────────────
  const afterChange = async () => { invalidate(); await load({ force: true }); await loadDocs(); };

  const editPerson = () => {
    const f = (id, label, val = '', type = 'text', extra = '') => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
    const sel = (id, label, val, opts) => `<div class="field"><label for="${id}">${label}</label><select class="select" id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    const m = openModal({
      title: 'Edit profile', size: 'lg',
      body: `<div class="form-2col">
        ${f('e-name', 'Full name', emp.name)}${f('e-email', 'Email', emp.email || '', 'email')}
        ${sel('e-type', 'Type', emp.employeeType, [['intern', 'Intern'], ['employee', 'Employee']])}${sel('e-status', 'Status', emp.status || 'active', [['active', 'Active'], ['former', 'Former']])}
        ${f('e-role', 'Role', emp.role || '')}${f('e-product', 'Project / product', emp.product || '')}
        ${sel('e-mode', 'Work mode', emp.workMode || '', [['', '—'], ['Remote', 'Remote'], ['On-site', 'On-site'], ['Hybrid', 'Hybrid']])}${f('e-reporting', 'Reporting to', emp.reportingTo || '')}
        ${f('e-inst', 'Institution', emp.institution || '')}${f('e-dept', 'Department', emp.department || '')}
        ${f('e-start', 'Start date', emp.startDate || '', 'date')}${f('e-end', 'End date', emp.endDate || '', 'date')}
      </div><div class="login-err" id="e-err" role="alert">${icon('alert-circle', { size: 18 })}<span></span></div>`,
      footer: `${button('Cancel', { attrs: 'data-close' })}${button('Save changes', { variant: 'primary', icon: 'check', attrs: 'id="e-save"' })}`,
    });
    m.el.querySelector('#e-save').addEventListener('click', async (ev) => {
      const v = (id) => m.el.querySelector('#' + id).value.trim();
      const errBox = m.el.querySelector('#e-err');
      if (!v('e-name')) { errBox.querySelector('span').textContent = 'Name is required.'; errBox.classList.add('is-on'); return; }
      const btn = ev.currentTarget; btn.classList.add('is-loading'); btn.disabled = true;
      try {
        await adminUpdateEmployee(ctx.token, emp._id, {
          name: v('e-name'), email: v('e-email'), employeeType: v('e-type'), status: v('e-status'), role: v('e-role'), product: v('e-product'),
          workMode: v('e-mode'), reportingTo: v('e-reporting'), institution: v('e-inst'), department: v('e-dept'), startDate: v('e-start'), endDate: v('e-end'),
        });
        m.close(); ctx.toast('Profile updated.', { title: 'Saved' });
        invalidate(); await load({ force: true }); ctx.go('people', emp._id);
      } catch (e) {
        errBox.querySelector('span').textContent = e.message || 'Could not save.'; errBox.classList.add('is-on');
        btn.classList.remove('is-loading'); btn.disabled = false;
      }
    });
  };

  const confirmModal = ({ title, text, confirm, danger = true, onYes }) => {
    const m = openModal({ title, body: `<p style="line-height:1.6">${text}</p>`, footer: `${button('Cancel', { attrs: 'data-close' })}${button(confirm, { variant: danger ? 'danger' : 'primary', icon: danger ? 'trash' : 'check', attrs: 'id="yes"' })}` });
    m.el.querySelector('#yes').addEventListener('click', async (e) => { e.currentTarget.classList.add('is-loading'); e.currentTarget.disabled = true; try { await onYes(); m.close(); } catch (er) { m.close(); ctx.toast(er.message || 'Something went wrong.', { type: 'error' }); } });
  };

  onAction(el, {
    tab: (b) => { tab = b.dataset.tab; paint(); if (tab === 'documents' && canKyc && docs === null) loadDocs(); },
    'goto-docs': () => { tab = 'documents'; paint(); },
    edit: editPerson,
    'delete-person': () => confirmModal({
      title: `Delete ${emp.name}?`, confirm: 'Delete permanently',
      text: `This permanently deletes <b>${esc(emp.name)}</b>'s profile <b>and every uploaded document</b>. Certificates already issued stay valid and can still be verified. This cannot be undone.`,
      onYes: async () => { await adminDeleteEmployee(ctx.token, emp._id); invalidate(); await load({ force: true }); ctx.toast(`${emp.name} was deleted.`, { title: 'Deleted' }); ctx.go('people'); },
    }),
    'view-doc': async (b) => {
      const w = window.open('', '_blank');   // open synchronously so popup blockers allow it
      try { const url = await adminOpenDocument(ctx.token, b.dataset.id); if (w) { w.opener = null; w.location.href = url; } else window.location.href = url; loadLog(); }
      catch (e) { if (w) w.close(); ctx.toast(e.message, { type: 'error' }); }
    },
    'verify-doc': async (b) => {
      b.classList.add('is-loading');
      try { await adminVerifyDocument(ctx.token, b.dataset.id, b.dataset.v === '1'); ctx.toast(b.dataset.v === '1' ? 'Document verified.' : 'Verification removed.', { title: 'Updated' }); await afterChange(); loadLog(); }
      catch (e) { b.classList.remove('is-loading'); ctx.toast(e.message, { type: 'error' }); }
    },
    'delete-doc': (b) => confirmModal({
      title: 'Delete this document?', confirm: 'Delete', text: 'The file is permanently removed. The person can upload it again.',
      onYes: async () => { await adminDeleteDocument(ctx.token, b.dataset.id); ctx.toast('Document deleted.'); await afterChange(); loadLog(); },
    }),
    'signed-copy': async (b) => {
      const cert = store.certs.find(c => c._id === b.dataset.id);
      const rec = cert && recFor(cert);
      if (!cert || !rec) return;
      const m = await import('../../pages/admin.js');
      m.openCertificateDocument(cert, rec);
    },
    'copy-accept': async (b) => {
      const cert = store.certs.find(c => c._id === b.dataset.id);
      if (!cert) return;
      try { await navigator.clipboard.writeText(acceptUrl(cert)); ctx.toast('Acceptance link copied.'); }
      catch { ctx.toast(acceptUrl(cert), { title: 'Copy this link' }); }
    },
    'open-cert': async (b) => {
      const cert = store.certs.find(c => c._id === b.dataset.id);
      if (!cert) return;
      const m = await import('../../pages/admin.js');
      m.openCertificateDocument(cert);
    },
    zip: async (b) => {
      b.classList.add('is-loading');
      try {
        const { zipSync } = await import('fflate');
        const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
        const files = {}; const failed = [];
        for (const d of docs || []) {
          const label = DOC_TYPES[d.docType]?.label || d.docType;
          try {
            const res = await fetch(await adminOpenDocument(ctx.token, d.id));
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const base = label.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            let name = base + (EXT[d.mimeType] || ''); for (let i = 2; files[name]; i++) name = `${base}_${i}${EXT[d.mimeType] || ''}`;
            files[name] = new Uint8Array(await res.arrayBuffer());
          } catch { failed.push(label); }
        }
        if (!Object.keys(files).length) throw new Error('No files could be downloaded');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }));
        a.download = `${(emp.empCode || emp.name).replace(/[^A-Za-z0-9_-]+/g, '_')}-documents.zip`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        ctx.toast(failed.length ? `ZIP created without: ${failed.join(', ')}` : 'ZIP downloaded.', { type: failed.length ? 'warn' : 'success' });
        loadLog();
      } catch (e) { ctx.toast(e.message, { type: 'error' }); }
      b.classList.remove('is-loading');
    },
  });

  paint();
  return () => { alive = false; };
}
