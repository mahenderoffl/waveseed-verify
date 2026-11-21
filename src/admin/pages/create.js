// ─── create.js — issue a certificate or letter, with a live preview ───────────
//   #admin/create            template picker
//   #admin/create/<type>     editor: form on the left, the real document on the right
//   (optional ?person=<id> pre-fills from a person)
import { icon } from '../../ui/icons.js';
import { esc, badge, button, empty, openModal, onAction } from '../../ui/components.js';
import { DOC_TYPES, CATEGORIES, FIELD_DEF, docType, sectionsFor, idPrefixFor } from '../../utils/docTypes.js';
import { generateDocument, brandSnapshot, payslipTotals, inr } from '../../templates/templates.js';
import { adminGetNextIds, adminAddCertificate } from '../../api.js';
import { LETTER_PURPOSE_GROUPS } from '../../pages/shared.js';
import { data as store, getScope, parentBusiness, invalidate, load } from '../state.js';
import { href } from '../router.js';

// Local calendar date (toISOString() is UTC and shows yesterday for the first hours of an Indian morning)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseMeta = (e) => { try { const m = e && e.meta ? JSON.parse(e.meta) : null; return m && typeof m === 'object' ? m : {}; } catch { return {}; } };
const WIDE = new Set(['customMessage', 'responsibilities', 'reason', 'strengths', 'achievements', 'recommendation', 'incident', 'currentlyWorking', 'splitHelper', 'letterPurpose', 'finalSettlement']);

export default function mount(el, ctx) {
  const query = new URLSearchParams((location.hash.split('?')[1]) || '');
  const doc = ctx.id ? docType(ctx.id) : null;
  if (ctx.id && !doc) ctx.toast('That template does not exist.', { type: 'warn' });
  return doc ? editor(el, ctx, doc, query) : hub(el, ctx, query);
}

// ══════════════════════════════════════════════════════════════════════════════
// Template picker
// ══════════════════════════════════════════════════════════════════════════════
function hub(el, ctx, query) {
  const personParam = query.get('person');
  const person = personParam ? store.employees.find(e => e._id === personParam) : null;
  let cat = 'all', term = '';

  el.innerHTML = `
  <div class="page-head"><div><h2>Create a document</h2><p>${person ? `For <b>${esc(person.name)}</b> — ` : ''}Pick a template. You'll see the real document update as you type.</p></div></div>
  ${person ? `<div class="callout callout--blue" style="margin-bottom:18px">${icon('user', { size: 18 })}<div>Creating for <b>${esc(person.name)}</b> ${person.empCode ? `<span class="mono">(${esc(person.empCode)})</span>` : ''}. Their details will be filled in automatically.</div></div>` : ''}
  <div class="row wrap gap-3" style="margin-bottom:20px">
    <div class="input-affix grow" style="max-width:380px;min-width:220px">${icon('search', { size: 17 })}<input class="input" id="tpl-q" placeholder="Search templates…" autocomplete="off"></div>
    <div class="segmented" id="tpl-cats"><button aria-pressed="true" data-cat="all">All</button>${CATEGORIES.map(c => `<button aria-pressed="false" data-cat="${c.id}">${esc(c.label)}</button>`).join('')}</div>
  </div>
  <div class="create-grid" id="tpl-grid"></div>`;

  const grid = el.querySelector('#tpl-grid');
  const paint = () => {
    const list = DOC_TYPES.filter(d => (cat === 'all' || d.cat === cat) && (!term || (d.name + ' ' + d.desc).toLowerCase().includes(term)));
    grid.innerHTML = list.length ? list.map(d => `
      <a class="tpl-card card card--interactive" href="${href('create', d.id)}${person ? `?person=${encodeURIComponent(person._id)}` : ''}">
        <span class="chip-icon chip-icon--${d.tone}" style="width:46px;height:46px;border-radius:14px">${icon(d.icon, { size: 23 })}</span>
        <div class="grow"><b class="tpl-card-title">${esc(d.name)}</b><p class="muted tpl-card-desc">${esc(d.desc)}</p></div>
        <span class="tpl-card-go">${badge(CATEGORIES.find(c => c.id === d.cat)?.label.replace(/s$/, '') || '', { variant: '' })}${icon('arrow-right', { size: 18 })}</span>
      </a>`).join('') : `<div style="grid-column:1/-1">${empty({ icon: 'search', title: 'No templates match', text: 'Try a different word.' })}</div>`;
  };
  el.querySelector('#tpl-q').addEventListener('input', (e) => { term = e.target.value.trim().toLowerCase(); paint(); });
  el.querySelector('#tpl-cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    cat = b.dataset.cat; el.querySelectorAll('#tpl-cats button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); paint();
  });
  paint();
}

// ══════════════════════════════════════════════════════════════════════════════
// Editor with live preview
// ══════════════════════════════════════════════════════════════════════════════
function editor(el, ctx, doc, query) {
  const DRAFT_KEY = `ws_draft_${doc.id}`;
  const values = {};
  let person = null;
  let bizId = (getScope() || parentBusiness()?.id || '');
  let alive = true;
  let previewTimer = null;
  let idTimer = 0;

  const biz = () => store.businesses.find(b => b.id === bizId) || parentBusiness();
  const code = () => biz()?.code || 'WS';
  const productsOf = () => { const b = biz(); return b && b.effective && Array.isArray(b.effective.products) ? b.effective.products : null; };

  // ── Defaults ───────────────────────────────────────────────────────────────
  const defaultFor = (fid) => {
    const def = FIELD_DEF[fid] || {};
    if (fid === 'issuedDate' || fid === 'date') return today();
    if (code() !== 'WS' && (fid === 'reportingTo' || fid === 'product')) return '';
    if (def.type === 'select') return def.opts?.[0] ?? '';
    return def.def || '';
  };
  doc.fields.forEach(f => { values[f] = defaultFor(f); });

  // Draft restore (never restores the IDs — those are always fresh)
  let restored = false;
  try {
    const raw = !query.get('person') && localStorage.getItem(DRAFT_KEY);
    if (raw) { const d = JSON.parse(raw); Object.keys(d).forEach(k => { if (k in values && k !== 'certId' && k !== 'refNum') values[k] = d[k]; }); restored = true; }
  } catch { /* ignore a corrupt draft */ }

  const saveDraft = () => {
    try { const d = { ...values }; delete d.certId; delete d.refNum; localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
  };

  // ── Data for preview / save ────────────────────────────────────────────────
  const buildData = () => {
    const d = { ...values }; delete d.splitHelper;
    d.certType = doc.id.replace('-cert', '');
    if (d.currentlyWorking) d.endDate = '';
    d.brand = brandSnapshot(biz());
    if (person && person.empCode) d.empCode = person.empCode;
    const dob = parseMeta(person).dob; if (dob) d.holderDob = dob;
    if (d.recipientEmail === undefined) d.recipientEmail = '';
    return d;
  };

  // ── Layout ─────────────────────────────────────────────────────────────────
  const bizList = store.businesses.filter(b => b.active);
  const sections = sectionsFor(doc);
  const people = [...store.employees].sort((a, b) => a.name.localeCompare(b.name));
  const sameType = store.certs.filter(c => c.certificateType === doc.id && c.templateData).slice(0, 40);

  el.innerHTML = `
  <div class="create-toolbar">
    <a class="btn btn--ghost btn-icon" href="${href('create')}${query.get('person') ? '?person=' + encodeURIComponent(query.get('person')) : ''}" aria-label="All templates" title="All templates">${icon('arrow-left')}</a>
    <span class="chip-icon chip-icon--${doc.tone}" style="width:40px;height:40px">${icon(doc.icon, { size: 20 })}</span>
    <div class="grow" style="min-width:0"><b class="truncate" style="display:block;font-size:16px">${esc(doc.name)}</b><span class="muted truncate" style="display:block;font-size:12.5px" id="issuing-line"></span></div>
    <div class="segmented show-mobile-only" id="pane-toggle" style="display:none"><button aria-pressed="true" data-pane="form">Edit</button><button aria-pressed="false" data-pane="preview">Preview</button></div>
    <button class="btn btn--primary hide-mobile-only" data-action="issue" id="issue-btn">${icon('check')} Issue document</button>
  </div>

  <div class="create-split" id="split" data-pane="form">
    <div class="create-form" id="form-pane">
      ${restored ? `<div class="callout callout--blue" id="draft-note">${icon('history', { size: 18 })}<div class="grow">Your unsaved draft was restored.</div>${button('Discard', { size: 'sm', variant: 'ghost', action: 'discard-draft' })}</div>` : ''}
      <section class="card fsec">
        <div class="fsec-title">${icon('wand', { size: 18 })} Start from</div>
        <div class="form-2col">
          <div class="field"><label for="pick-person">A person</label>
            <select class="select" id="pick-person"><option value="">— Fill in manually —</option>${people.map(p => `<option value="${esc(p._id)}">${esc(p.name)}${p.empCode ? ' · ' + esc(p.empCode) : ''}</option>`).join('')}</select></div>
          <div class="field"><label for="pick-doc">An earlier document</label>
            <select class="select" id="pick-doc"><option value="">— None —</option>${sameType.map(c => `<option value="${esc(c._id)}">${esc(c.holderName)} · ${esc(c.certificateId)}</option>`).join('')}</select></div>
        </div>
        ${bizList.length > 1 ? `<div class="field" style="margin-top:14px"><label for="pick-biz">Issued by</label>
          <select class="select" id="pick-biz">${bizList.map(b => `<option value="${esc(b.id)}">${esc(b.displayName)} (${esc(b.code)})</option>`).join('')}</select>
          <div class="field-hint">Decides the letterhead, signatory, ID prefix and product list.</div></div>` : ''}
      </section>
      <div id="sections"></div>
      <div class="create-actionbar show-mobile-only" style="display:none">${button('Preview', { icon: 'eye', action: 'show-preview' })}<button class="btn btn--primary grow" data-action="issue">${icon('check')} Issue document</button></div>
    </div>

    <div class="create-preview" id="preview-pane">
      <div class="pv-bar"><span class="row gap-2">${icon('eye', { size: 16 })}<b>Live preview</b></span><span class="muted" id="pv-state">Up to date</span></div>
      <div class="pv-stage" id="pv-stage"><div class="pv-frame-wrap" id="pv-wrap"></div></div>
    </div>
  </div>`;

  const $ = (s) => el.querySelector(s);
  const split = $('#split');

  // ── Field rendering ────────────────────────────────────────────────────────
  const ctl = (fid, def, v) => {
    const id = `f-${fid}`;
    const common = `id="${id}" data-f="${fid}"`;
    if (fid === 'product') {
      const list = productsOf();
      if (list && list.length) {
        const known = !v || list.includes(v);
        return `<select class="select" ${common}><option value="">— Select —</option>${list.map(p => `<option value="${esc(p)}" ${p === v ? 'selected' : ''}>${esc(p)}</option>`).join('')}<option value="__custom__" ${!known ? 'selected' : ''}>Other…</option></select>
          <input class="input" data-fc="${fid}" placeholder="Type the product or project name" value="${!known ? esc(v) : ''}" style="margin-top:8px;${known ? 'display:none' : ''}">`;
      }
      return `<input class="input" ${common} value="${esc(v)}" placeholder="${esc(def.ph || '')}">`;
    }
    if (fid === 'letterPurpose') {
      const known = LETTER_PURPOSE_GROUPS.flatMap(([, o]) => o);
      const isKnown = !v || known.includes(v);
      return `<select class="select" ${common}><option value="">— General (personal records / official use) —</option>
        ${LETTER_PURPOSE_GROUPS.map(([label, opts]) => `<optgroup label="${esc(label.replace(/^[^\w]+/, ''))}">${opts.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</optgroup>`).join('')}
        <option value="__custom__" ${!isKnown ? 'selected' : ''}>Other…</option></select>
        <input class="input" data-fc="${fid}" placeholder="e.g. Admission to M.S. program at XYZ University" value="${!isKnown ? esc(v) : ''}" style="margin-top:8px;${isKnown ? 'display:none' : ''}">`;
    }
    if (def.type === 'textarea') return `<textarea class="textarea" ${common} placeholder="${esc(def.ph || '')}">${esc(v)}</textarea>`;
    if (def.type === 'select') return `<select class="select" ${common}>${(def.opts || []).map((o, i) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(def.optLabels?.[i] || o || '— Select —')}</option>`).join('')}</select>`;
    if (def.type === 'amount') return `<input class="input tnum" ${common} type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${esc(v)}" ${def.grp ? 'data-pay="1"' : ''}>`;
    if (fid === 'certId' || fid === 'refNum') return `<div class="pw-wrap"><input class="input mono" ${common} value="${esc(v)}" placeholder="${esc(def.ph || '')}" autocomplete="off" spellcheck="false"><button type="button" class="btn btn--ghost btn-icon btn-sm pw-toggle" data-action="renew-ids" title="Generate the next number" aria-label="Generate the next number">${icon('refresh', { size: 16 })}</button></div>`;
    return `<input class="input" ${common} type="${def.type || 'text'}" value="${esc(v)}" placeholder="${esc(def.ph || '')}" ${def.type === 'number' ? 'min="0"' : ''}>`;
  };

  const fieldHTML = (fid) => {
    const def = FIELD_DEF[fid]; const v = values[fid] ?? '';
    const wide = WIDE.has(fid) || def.type === 'textarea';
    if (fid === 'splitHelper') return `<div class="field field--wide"><div class="callout callout--teal-soft" style="padding:12px 14px">${icon('zap', { size: 18 })}<div class="grow"><b>${esc(def.label)}</b>
      <div class="row gap-2" style="margin-top:8px"><input class="input" id="split-gross" type="number" min="0" step="0.01" placeholder="Monthly gross, e.g. 30000" style="max-width:240px">${button('Suggest split', { size: 'sm', icon: 'wand', action: 'split' })}</div>
      <div class="field-hint" style="margin-top:6px">Basic 50%, HRA 40% of Basic, rest Special Allowance, PF 12% of Basic (max ₹1,800), PT ₹200 if gross ≥ ₹15,000. Suggestions only — edit freely.</div></div></div></div>`;
    if (def.type === 'checkbox') return `<div class="field field--wide"><label class="check"><input type="checkbox" id="f-${fid}" data-f="${fid}" ${v === 'yes' ? 'checked' : ''}> ${esc(def.label)}</label></div>`;
    const head = fid === 'basicPay' ? '<div class="field--wide fsub fsub--earn">Earnings</div>' : fid === 'pfDeduction' ? '<div class="field--wide fsub fsub--ded">Deductions</div>' : '';
    return `${head}<div class="field${wide ? ' field--wide' : ''}" data-field="${fid}"><label for="f-${fid}">${esc(def.label)}${def.req ? ' <span class="req">*</span>' : ''}</label>${ctl(fid, def, v)}</div>`;
  };

  const renderSections = () => {
    $('#sections').innerHTML = sections.map(s => `<section class="card fsec"><div class="fsec-title">${icon(s.icon, { size: 18 })} ${esc(s.title)}</div><div class="form-2col">${s.fields.map(fieldHTML).join('')}</div>${s.id === 'pay' && doc.id === 'salary-slip' ? '<div class="pay-totals" id="pay-totals"></div>' : ''}</section>`).join('');
    updateTotals(); syncOngoing();
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const setField = (fid, val) => {
    if (!(fid in values)) return;
    values[fid] = val ?? '';
    const input = el.querySelector(`#f-${fid}`);
    if (!input) return;
    if (input.type === 'checkbox') input.checked = values[fid] === 'yes';
    else if (input.tagName === 'SELECT') {
      const has = [...input.options].some(o => o.value === values[fid]);
      input.value = has ? values[fid] : (values[fid] ? '__custom__' : '');
      const c = el.querySelector(`[data-fc="${fid}"]`);
      if (c) { c.style.display = input.value === '__custom__' ? '' : 'none'; if (input.value === '__custom__') c.value = values[fid]; }
    } else input.value = values[fid];
  };
  function syncOngoing() {
    const end = el.querySelector('#f-endDate'); const chk = el.querySelector('#f-currentlyWorking');
    if (end && chk) { end.disabled = chk.checked; if (chk.checked) { end.value = ''; values.endDate = ''; } }
  }
  function updateTotals() {
    const box = el.querySelector('#pay-totals'); if (!box) return;
    const t = payslipTotals(values);
    box.innerHTML = `<span>Gross <b>${inr(t.gross)}</b></span><span>Deductions <b>${inr(t.deductions)}</b></span><span>Net pay <b style="color:${t.net < 0 ? '#ff8a80' : '#f0d078'}">${inr(t.net)}</b></span>`;
  }
  const updateIssuingLine = () => { const b = biz(); $('#issuing-line').textContent = `${b ? b.displayName : ''}${person ? ' · for ' + person.name : ''}`; };

  // ── Numbers (certificate ID / reference) ───────────────────────────────────
  async function renewIds({ force = false } = {}) {
    if (!('certId' in values) && !('refNum' in values)) return;
    const mine = ++idTimer;
    try {
      const next = await adminGetNextIds(ctx.token, code());
      if (!alive || mine !== idTimer) return;
      const seq = next.nextCertId.split('-').pop();
      const refSeq = next.nextRefNum.split('/').pop();
      const year = new Date().getFullYear();
      const isEmp = person ? person.employeeType === 'employee' : /employment|salary|promotion/.test(doc.id);
      const prefix = idPrefixFor(doc.id, person?.employeeType).replace(/^WS(?=-)/, code());
      const ref = code() === 'WS' ? `WS/${isEmp ? 'EMP' : 'INT'}/${year}/AI-FS/${refSeq}` : `${code()}/${isEmp ? 'EMP' : 'INT'}/${year}/${refSeq}`;
      if ('certId' in values && (force || !values.certId)) setField('certId', `${prefix}-${year}-${seq}`);
      if ('refNum' in values && (force || !values.refNum)) setField('refNum', ref);
      schedulePreview();
    } catch { /* numbers can be typed manually */ }
  }

  // ── Person / earlier document / business ───────────────────────────────────
  function applyPerson(p) {
    person = p || null;
    if (!p) { updateIssuingLine(); schedulePreview(); return; }
    const pb = store.businesses.find(b => b.id === p.businessId) || parentBusiness();
    if (pb && pb.id !== bizId) { bizId = pb.id; const sel = $('#pick-biz'); if (sel) sel.value = bizId; renderSections(); }
    const map = {
      holderName: p.name, recipientName: p.name, recipientEmail: p.email, recipientCollege: p.institution, recipientDept: p.department,
      holderInstitution: p.institution, holderDepartment: p.department, department: p.department, role: p.role, product: p.product,
      workMode: p.workMode, startDate: p.startDate, endDate: p.endDate, reportingTo: p.reportingTo, joiningDate: p.startDate, employeeCode: p.empCode,
    };
    Object.entries(map).forEach(([f, v]) => { if (v && f in values) setField(f, v); });
    if ('currentlyWorking' in values) { setField('currentlyWorking', p.status !== 'former' && !p.endDate ? 'yes' : ''); syncOngoing(); }
    updateIssuingLine(); renewIds({ force: true }); schedulePreview();
    ctx.toast(`Filled in from ${p.name}.`, { title: 'Details loaded' });
  }
  function applyDoc(c) {
    let t = {}; try { t = JSON.parse(c.templateData || '{}'); } catch { /* ignore */ }
    Object.keys(values).forEach(f => { if (f !== 'certId' && f !== 'refNum' && f !== 'issuedDate' && f !== 'date' && t[f] !== undefined) setField(f, t[f]); });
    syncOngoing(); updateTotals(); schedulePreview();
    ctx.toast(`Copied from ${c.certificateId}. Numbers and dates are new.`, { title: 'Details copied' });
  }

  // ── Live preview ───────────────────────────────────────────────────────────
  function previewSize() { return doc.cat === 'certificate' ? 1120 : 900; }
  function schedulePreview() { $('#pv-state').textContent = 'Updating…'; clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 260); }
  function renderPreview() {
    if (!alive) return;
    const wrap = $('#pv-wrap'); const stage = $('#pv-stage');
    let html;
    try { html = generateDocument(doc.id, buildData()); }
    catch (e) { wrap.innerHTML = `<div class="callout callout--rose" style="margin:20px">${icon('alert-triangle', { size: 18 })}<div>The preview could not be drawn: ${esc(e.message)}</div></div>`; $('#pv-state').textContent = 'Error'; return; }
    html = html.replace('</head>', '<style>.print-btn{display:none!important} html{background:#fff}</style></head>');
    const W = previewSize();
    const next = document.createElement('iframe');
    next.setAttribute('sandbox', 'allow-same-origin');   // the document has no scripts; nothing may run
    next.setAttribute('title', 'Document preview');
    next.className = 'pv-frame';
    next.style.width = W + 'px';
    next.onload = () => {
      if (!alive) return;
      try {
        const h = Math.max(next.contentDocument.documentElement.scrollHeight, next.contentDocument.body.scrollHeight);
        const k = Math.min(1, stage.clientWidth / W);
        next.style.height = h + 'px';
        next.style.transform = `scale(${k})`;
        wrap.style.height = Math.round(h * k) + 'px';
      } catch { /* cross-origin never happens for srcdoc */ }
      wrap.querySelectorAll('.pv-frame').forEach(f => { if (f !== next) f.remove(); });
      next.style.visibility = 'visible';
      $('#pv-state').textContent = 'Up to date';
    };
    next.style.visibility = 'hidden';
    next.srcdoc = html;
    wrap.appendChild(next);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const f = el.querySelector('.pv-frame'); if (f && f.style.height) { const k = Math.min(1, $('#pv-stage').clientWidth / previewSize()); f.style.transform = `scale(${k})`; $('#pv-wrap').style.height = Math.round(parseFloat(f.style.height) * k) + 'px'; } }) : null;
  ro && ro.observe($('#pv-stage'));

  // ── Validation & issue ─────────────────────────────────────────────────────
  const missingRequired = () => doc.fields.filter(f => FIELD_DEF[f]?.req && !String(values[f] ?? '').trim());
  function payrollError() {
    if (doc.id === 'salary-slip') {
      const { gross, net } = payslipTotals(values);
      if (gross <= 0) return 'Enter at least one earning amount.';
      if (net < 0) return 'Total deductions exceed gross earnings — please check the amounts.';
      const wd = parseFloat(values.workingDays), pd = parseFloat(values.paidDays);
      if (values.workingDays && (!(wd > 0) || wd > 31)) return 'Working days must be between 1 and 31.';
      if (values.paidDays && (pd < 0 || (wd > 0 && pd > wd))) return 'Paid days cannot exceed working days.';
      if (values.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(values.pan)) return 'PAN should look like ABCDE1234F.';
      const name = (values.recipientName || '').trim().toLowerCase();
      const dup = store.certs.find(c => {
        if (c.certificateType !== 'salary-slip' || c.status === 'revoked') return false;
        if ((c.holderName || '').trim().toLowerCase() !== name) return false;
        try { return JSON.parse(c.templateData || '{}').payMonth === values.payMonth; } catch { return false; }
      });
      if (dup) return `A slip for ${values.recipientName} for ${values.payMonth} already exists (${dup.certificateId}). Revoke it first or choose another month.`;
    }
    if (doc.id === 'salary-certificate' && !values.monthlyGross && !values.annualCtc) return 'Enter the monthly gross salary or the annual CTC.';
    return '';
  }

  async function issue(btn) {
    el.querySelectorAll('.has-error').forEach(x => x.classList.remove('has-error'));
    const missing = missingRequired();
    if (missing.length) {
      missing.forEach(f => el.querySelector(`[data-field="${f}"]`)?.classList.add('has-error'));
      el.querySelector(`[data-field="${missing[0]}"] .input, [data-field="${missing[0]}"] .select, [data-field="${missing[0]}"] .textarea`)?.focus();
      ctx.toast(`Please fill in: ${missing.map(f => FIELD_DEF[f].label).join(', ')}`, { type: 'warn', title: 'Missing details' });
      split.dataset.pane = 'form'; return;
    }
    const perr = payrollError();
    if (perr) { ctx.toast(perr, { type: 'warn', title: 'Check the amounts' }); return; }

    const d = buildData(); const b = biz();
    const buttons = el.querySelectorAll('[data-action="issue"]'); buttons.forEach(x => { x.classList.add('is-loading'); x.disabled = true; });
    try {
      await adminAddCertificate(ctx.token, {
        certificateId: d.certId || '', referenceNumber: d.refNum || '',
        holderName: d.holderName || d.recipientName || '', holderEmail: d.recipientEmail || '',
        holderInstitution: d.holderInstitution || d.recipientCollege || '', holderDepartment: d.holderDepartment || d.recipientDept || '',
        holderDob: d.holderDob || undefined, certificateType: doc.id, role: d.role || '', product: d.product || '',
        reportingTo: d.reportingTo || '', workMode: d.workMode || '',
        issuedDate: d.issuedDate || d.date || today(), startDate: d.startDate || '', endDate: d.endDate || '',
        issuerName: d.issuerName || d.brand?.sigName || 'Mahender',
        issuerTitle: d.issuerTitle || (d.brand?.sigTitle ? `${d.brand.sigTitle}, ${d.brand.legal || d.brand.name}` : 'Founder, WaveSeed Co.'),
        notes: `Created from the Create screen: ${doc.name}${d.payMonth ? ` (${d.payMonth})` : ''}`,
        nameFont: d.nameFont || 'cursive', templateData: JSON.stringify(d),
        employeeId: person?._id, businessId: b?.id,
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      invalidate(); await load({ force: true });
      showIssued(d);
    } catch (e) {
      ctx.toast(e.message || 'Could not save the document.', { type: 'error', title: 'Not saved' });
    } finally { buttons.forEach(x => { x.classList.remove('is-loading'); x.disabled = false; }); }
  }

  function showIssued(d) {
    const link = `${location.origin}/?id=${encodeURIComponent(d.certId)}`;
    const m = openModal({
      title: 'Document issued',
      body: `<div style="text-align:center;padding:6px 0 4px"><span class="chip-icon chip-icon--green" style="width:64px;height:64px;border-radius:20px;margin:0 auto 14px">${icon('badge-check', { size: 32 })}</span>
        <h3 style="font-size:18px;margin-bottom:6px">${esc(doc.name)} is ready</h3>
        <div class="muted">Saved to the registry${person ? ` and linked to <b>${esc(person.name)}</b>` : ''}.</div>
        <div class="mono strong" style="margin:14px 0 4px;font-size:15px">${esc(d.certId)}</div>
        <div class="muted" style="font-size:12.5px">Anyone can verify it at the public verification page.</div></div>`,
      footer: `${button('Create another', { action: 'another' })}${person ? button('View person', { icon: 'user', action: 'view-person' }) : ''}${button('Copy verification link', { icon: 'link', action: 'copy-link' })}${button('Open document', { variant: 'primary', icon: 'external-link', action: 'open' })}`,
    });
    onAction(m.el, {
      open: () => { const w = window.open('', '_blank', 'width=1100,height=860'); if (!w) { ctx.toast('Popup blocked — allow popups to open the document.', { type: 'warn' }); return; } w.document.open(); w.document.write(generateDocument(doc.id, d)); w.document.close(); },
      'copy-link': async () => { try { await navigator.clipboard.writeText(link); ctx.toast('Verification link copied.', { title: 'Copied' }); } catch { ctx.toast(link); } },
      'view-person': () => { m.close(); ctx.go('people', person._id); },
      another: () => { m.close(); ctx.go('create', doc.id); },
    });
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  const form = $('#form-pane');
  const onField = (e) => {
    const t = e.target;
    const fid = t.dataset.f || t.dataset.fc; if (!fid) return;
    if (t.dataset.fc) { values[fid] = t.value.trim(); }
    else if (t.type === 'checkbox') { values[fid] = t.checked ? 'yes' : ''; if (fid === 'currentlyWorking') syncOngoing(); }
    else if (t.tagName === 'SELECT' && (fid === 'product' || fid === 'letterPurpose')) {
      const custom = form.querySelector(`[data-fc="${fid}"]`);
      if (t.value === '__custom__') { custom.style.display = ''; custom.focus(); values[fid] = custom.value.trim(); } else { if (custom) custom.style.display = 'none'; values[fid] = t.value; }
    } else values[fid] = t.value;
    t.closest('.field')?.classList.remove('has-error');
    if (t.dataset.pay) updateTotals();
    saveDraft(); schedulePreview();
  };
  form.addEventListener('input', onField);
  form.addEventListener('change', onField);

  $('#pick-person').addEventListener('change', (e) => applyPerson(store.employees.find(p => p._id === e.target.value)));
  $('#pick-doc').addEventListener('change', (e) => { const c = store.certs.find(x => x._id === e.target.value); if (c) applyDoc(c); });
  $('#pick-biz')?.addEventListener('change', (e) => {
    // Defaults that belong to one business (e.g. WaveSeed's "Chief Developer") must not leak into another
    const old = {}; ['reportingTo', 'product'].forEach(f => { if (f in values) old[f] = defaultFor(f); });
    bizId = e.target.value;
    Object.keys(old).forEach(f => { if (values[f] === old[f]) values[f] = defaultFor(f); });
    renderSections(); updateIssuingLine(); renewIds({ force: true }); schedulePreview();
  });
  $('#pane-toggle')?.addEventListener('click', (e) => { const b = e.target.closest('[data-pane]'); if (!b) return; split.dataset.pane = b.dataset.pane; el.querySelectorAll('#pane-toggle button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (b.dataset.pane === 'preview') setTimeout(renderPreview, 30); });

  onAction(el, {
    issue: (b) => issue(b),
    'renew-ids': () => renewIds({ force: true }),
    'discard-draft': () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } ctx.go('create', doc.id); },
    'show-preview': () => { split.dataset.pane = 'preview'; el.querySelectorAll('#pane-toggle button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pane === 'preview'))); setTimeout(renderPreview, 30); window.scrollTo(0, 0); },
    split: () => {
      const g = parseFloat(el.querySelector('#split-gross')?.value);
      if (!(g > 0)) return ctx.toast('Enter a monthly gross amount first.', { type: 'warn' });
      const stipend = values.payslipType === 'Stipend Slip';
      const set = (f, v) => setField(f, v ? v.toFixed(2) : '');
      if (stipend) { set('basicPay', g); ['hra', 'specialAllowance', 'conveyance', 'pfDeduction', 'professionalTax'].forEach(f => set(f, 0)); }
      else { const basic = Math.round(g * 0.5), hra = Math.round(basic * 0.4); set('basicPay', basic); set('hra', hra); set('specialAllowance', g - basic - hra); set('conveyance', 0); set('pfDeduction', Math.min(Math.round(basic * 0.12), 1800)); set('professionalTax', g >= 15000 ? 200 : 0); }
      updateTotals(); saveDraft(); schedulePreview();
    },
  });

  // ── Start ──────────────────────────────────────────────────────────────────
  renderSections();
  updateIssuingLine();
  const preselect = query.get('person') && store.employees.find(p => p._id === query.get('person'));
  if (preselect) { $('#pick-person').value = preselect._id; applyPerson(preselect); } else renewIds();
  if ($('#pick-biz')) $('#pick-biz').value = bizId;
  renderPreview();

  return () => { alive = false; clearTimeout(previewTimer); ro && ro.disconnect(); };
}
