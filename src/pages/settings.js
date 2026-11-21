// ─── settings.js — Settings → Businesses (branding, signatory, hierarchy) ─────
import {
  adminGetBusinesses, adminCreateBusiness, adminUpdateBusiness,
  adminSetBusinessImage, adminClearBusinessImage, adminGetBusinessLog,
} from '../api.js';

let token = '';
let businesses = [];
let canEdit = false;
let selectedId = null;

const TEXT_FIELDS = [
  { key: 'legalName', label: 'Legal name',     hint: 'Printed as the issuing company on letters' },
  { key: 'tagline',   label: 'Tagline' },
  { key: 'website',   label: 'Website',        placeholder: 'www.example.com' },
  { key: 'email',     label: 'Contact email' },
  { key: 'address',   label: 'Address',        textarea: true },
];

const IMAGE_LABELS = {
  logo:      { title: 'Logo',           note: 'Shown in the letter header. PNG with transparent background works best.' },
  seal:      { title: 'Seal / stamp',   note: 'Shown on certificates.' },
  signature: { title: 'Signature image', note: 'Transparent PNG of the signature. Inherited together with the signatory name.' },
};

const ACTION_LABELS = { create: 'created the business', update: 'changed', image_set: 'uploaded', image_clear: 'removed' };
const FIELD_LABELS = {
  displayName: 'display name', legalName: 'legal name', tagline: 'tagline', address: 'address', website: 'website',
  email: 'email', brandColor: 'brand colour', products: 'product list', signatoryName: 'signatory name', signatoryTitle: 'signatory title',
  active: 'active status', code: 'code', logo: 'logo', seal: 'seal', signature: 'signature image',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(msg, type = 'success') {
  document.getElementById('ws-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'ws-toast';
  t.className = `toast ${type}`;
  t.innerHTML = '<span></span>';
  t.firstElementChild.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

const byId = id => businesses.find(b => b.id === id);
const parentOf = b => (b.parentId ? byId(b.parentId) : null);
const nameOfCode = code => businesses.find(b => b.code === code)?.displayName || code;

// ─── Entry ─────────────────────────────────────────────────────────────────────
export async function initSettingsPage(mainEl, adminToken) {
  token = adminToken;
  mainEl.innerHTML = `
<div class="admin-page-header">
  <div>
    <div class="admin-page-title">⚙️ Settings — Businesses</div>
    <div class="admin-page-subtitle">Branding and signatory for WaveSeed and each venture. Ventures inherit anything they leave empty.</div>
  </div>
  <button class="btn-primary" id="btn-add-business" style="width:auto;padding:10px 18px;font-size:0.85rem;">+ Add Business</button>
</div>
<div id="settings-body" style="display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:20px;align-items:start;">
  <div id="biz-tree" class="stat-card" style="padding:14px;">Loading…</div>
  <div id="biz-editor" class="stat-card" style="padding:20px;"></div>
</div>
<style>@media (max-width:820px){#settings-body{grid-template-columns:1fr !important;}}</style>`;

  document.getElementById('btn-add-business').addEventListener('click', openAddModal);
  await reload();
}

async function reload(keepSelection = true) {
  try {
    const res = await adminGetBusinesses(token);
    businesses = res.businesses;
    canEdit = res.canEdit;
    if (!keepSelection || !byId(selectedId)) selectedId = (businesses.find(b => !b.parentId) || businesses[0])?.id || null;
    renderTree();
    await renderEditor();
  } catch (err) {
    document.getElementById('biz-tree').innerHTML = `<p style="color:var(--red);">❌ ${esc(err.message)}</p>`;
  }
}

// ─── Tree ──────────────────────────────────────────────────────────────────────
function renderTree() {
  const roots = businesses.filter(b => !b.parentId);
  const node = (b, depth) => {
    const kids = businesses.filter(x => x.parentId === b.id);
    const sel = b.id === selectedId;
    return `
<button data-biz="${esc(b.id)}" class="biz-node" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin:4px 0;padding:10px 12px;margin-left:${depth * 18}px;max-width:calc(100% - ${depth * 18}px);border-radius:10px;cursor:pointer;border:1px solid ${sel ? 'var(--gold)' : 'var(--gray-200)'};background:${sel ? '#fffbeb' : 'var(--white)'};color:var(--gray-800);">
  <span style="font-family:monospace;font-weight:700;font-size:0.78rem;color:var(--gold-dark);">${esc(b.code)}</span>
  <span style="flex:1;font-weight:600;font-size:0.88rem;">${esc(b.displayName)}</span>
  ${b.active ? '' : '<span style="font-size:0.7rem;color:var(--red);">inactive</span>'}
</button>${kids.map(k => node(k, depth + 1)).join('')}`;
  };
  const el = document.getElementById('biz-tree');
  el.innerHTML = `<div style="font-size:0.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-600);margin-bottom:6px;">Hierarchy</div>${roots.map(r => node(r, 0)).join('')}`;
  el.querySelectorAll('[data-biz]').forEach(btn => btn.addEventListener('click', async () => {
    selectedId = btn.dataset.biz;
    renderTree();
    await renderEditor();
  }));
}

// ─── Editor ────────────────────────────────────────────────────────────────────
function inheritedPlaceholder(b, key) {
  const parent = parentOf(b);
  if (!parent) return 'Not set';
  const eff = parent.effective?.[key];
  return eff?.value ? `Inherited: ${eff.value}` : 'Not set';
}

function sourceNote(b, key) {
  if (b.own?.[key]) return '';
  const eff = b.effective?.[key];
  if (eff?.value && eff.from && eff.from !== b.code) return `<div style="font-size:0.72rem;color:var(--gray-500);margin-top:3px;">Using ${esc(nameOfCode(eff.from))}'s value</div>`;
  return '';
}

function imageBlock(b, kind) {
  const meta = IMAGE_LABELS[kind];
  const ownUrl = kind === 'signature' ? b.own.signatureUrl : kind === 'logo' ? b.own.logoUrl : b.own.sealUrl;
  const eff = kind === 'signature'
    ? { value: b.effective.signatory.signature, from: b.effective.signatory.from }
    : b.effective[kind];
  const shown = ownUrl || eff?.value;
  const origin = ownUrl ? 'Own image' : (eff?.value ? `Inherited from ${esc(nameOfCode(eff.from))}` : 'Not set — built-in default is used');
  return `
<div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px;background:#fafafa;">
  <div style="font-weight:700;font-size:0.85rem;color:var(--navy);">${meta.title}</div>
  <div style="font-size:0.72rem;color:var(--gray-500);margin:2px 0 8px;">${meta.note}</div>
  <div style="height:90px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 16px 16px;border-radius:8px;border:1px dashed var(--gray-200);">
    ${shown ? `<img src="${esc(shown)}" alt="${esc(meta.title)}" style="max-height:80px;max-width:90%;object-fit:contain;" />` : '<span style="font-size:0.75rem;color:var(--gray-400);">No image</span>'}
  </div>
  <div style="font-size:0.72rem;color:var(--gray-600);margin:6px 0;">${origin}</div>
  ${canEdit ? `<div style="display:flex;gap:6px;">
    <label class="btn-secondary" style="cursor:pointer;padding:6px 12px;font-size:0.78rem;margin:0;">Upload
      <input type="file" accept="image/png,image/jpeg,image/webp" data-image-kind="${kind}" style="display:none;" /></label>
    ${ownUrl ? `<button class="btn-secondary" data-image-clear="${kind}" style="padding:6px 12px;font-size:0.78rem;">Remove</button>` : ''}
  </div>` : ''}
</div>`;
}

async function renderEditor() {
  const el = document.getElementById('biz-editor');
  const b = byId(selectedId);
  if (!b) { el.innerHTML = '<p>No business selected.</p>'; return; }
  if (!b.own) { el.innerHTML = '<p style="color:var(--gray-500);">You can view the hierarchy but not edit branding.</p>'; return; }

  const parent = parentOf(b);
  const sig = b.effective.signatory;
  const dis = canEdit ? '' : 'disabled';
  const sectionTitle = t => `<div style="font-size:0.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-600);margin:22px 0 10px;">${t}</div>`;

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
  <div>
    <div style="font-size:1.15rem;font-weight:700;color:var(--navy);">${esc(b.displayName)} <span style="font-family:monospace;font-size:0.85rem;color:var(--gold-dark);">${esc(b.code)}</span></div>
    <div style="font-size:0.78rem;color:var(--gray-500);">${parent ? `A venture of ${esc(parent.displayName)}` : 'Parent company'} · IDs look like <span style="font-family:monospace;">${esc(b.code)}-INT-${new Date().getFullYear()}-0001</span></div>
  </div>
</div>

${sectionTitle('Identity')}
<div class="form-group">
  <label class="form-label">Display name</label>
  <input id="bz-displayName" class="form-input" value="${esc(b.displayName)}" maxlength="80" ${dis} />
</div>
<div style="font-size:0.75rem;color:var(--gray-500);margin-top:-4px;">The code <strong>${esc(b.code)}</strong> is part of every ID issued and cannot be changed.</div>

${sectionTitle('Public links')}
<div style="font-size:0.82rem;color:var(--gray-800);">
  <div style="margin-bottom:4px;font-weight:600;">Onboarding form for <strong>${esc(b.displayName)}</strong></div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <code id="bz-link" style="background:var(--gray-100);padding:6px 10px;border-radius:6px;font-size:0.78rem;word-break:break-all;">${esc(location.origin + location.pathname + '#onboard/' + b.code.toLowerCase())}</code>
    <button class="btn-secondary" id="bz-copy" style="padding:6px 12px;font-size:0.78rem;">Copy link</button>
  </div>
  <div style="font-size:0.72rem;color:var(--gray-500);margin-top:4px;">People who fill this form join <strong>${esc(b.displayName)}</strong> and get a ${esc(b.code)}-… ID. Verification and document links are shared by all businesses.</div>
</div>

${sectionTitle('Branding & contact')}
${TEXT_FIELDS.map(f => `
<div class="form-group" style="margin-bottom:12px;">
  <label class="form-label">${f.label}</label>
  ${f.textarea
    ? `<textarea id="bz-${f.key}" class="form-textarea" rows="2" maxlength="300" placeholder="${esc(inheritedPlaceholder(b, f.key))}" ${dis}>${esc(b.own[f.key])}</textarea>`
    : `<input id="bz-${f.key}" class="form-input" maxlength="120" placeholder="${esc(f.placeholder && !parent ? f.placeholder : inheritedPlaceholder(b, f.key))}" value="${esc(b.own[f.key])}" ${dis} />`}
  ${sourceNote(b, f.key)}${f.hint ? `<div style="font-size:0.72rem;color:var(--gray-500);margin-top:3px;">${f.hint}</div>` : ''}
</div>`).join('')}
<div class="form-group" style="margin-bottom:12px;">
  <label class="form-label">Brand colour</label>
  <div style="display:flex;gap:8px;align-items:center;">
    <input type="color" id="bz-brandColor-picker" value="${esc(b.effective.brandColor.value || '#0d1b3e')}" style="width:44px;height:36px;border:1px solid var(--gray-200);border-radius:6px;padding:2px;" ${dis} />
    <input id="bz-brandColor" class="form-input" style="max-width:160px;" placeholder="${esc(inheritedPlaceholder(b, 'brandColor'))}" value="${esc(b.own.brandColor)}" maxlength="7" ${dis} />
  </div>
  ${sourceNote(b, 'brandColor')}
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:6px;">
  ${imageBlock(b, 'logo')}${imageBlock(b, 'seal')}
</div>

${sectionTitle('Products / projects')}
<div class="form-group" style="margin-bottom:12px;">
  <label class="form-label">Offered in forms and letters (one per line)</label>
  <textarea id="bz-products" class="form-textarea" rows="5" placeholder="e.g. WaveBase AI&#10;Client Portal App" ${dis}>${esc((b.own.products || []).join('\n'))}</textarea>
  <div style="font-size:0.72rem;color:var(--gray-500);margin-top:3px;">Not inherited — each business has its own list. Max 30. Leave empty if this business has no named products.</div>
</div>

${sectionTitle('Signatory')}
<div style="font-size:0.82rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 12px;color:var(--gray-800);margin-bottom:12px;">
  Letters from <strong>${esc(b.displayName)}</strong> are signed by
  <strong>${esc(sig.name || 'nobody set')}</strong>${sig.title ? `, ${esc(sig.title)}` : ''}
  ${sig.from && sig.from !== b.code ? `<span style="color:var(--gray-500);">(inherited from ${esc(nameOfCode(sig.from))})</span>` : ''}.
  <div style="font-size:0.74rem;color:var(--gray-500);margin-top:4px;">Name, title and signature image move together. Leave the name empty to inherit all three${parent ? ` from ${esc(parent.displayName)}` : ''}.${!parent ? ' When HR takes over, HR sets their own name and signature here and every venture that inherits follows.' : ''}</div>
</div>
<div class="form-group" style="margin-bottom:12px;">
  <label class="form-label">Signatory name</label>
  <input id="bz-signatoryName" class="form-input" maxlength="80" placeholder="${esc(parent?.effective?.signatory?.name ? 'Inherited: ' + parent.effective.signatory.name : 'e.g. Full name')}" value="${esc(b.own.signatoryName)}" ${dis} />
</div>
<div class="form-group" style="margin-bottom:12px;">
  <label class="form-label">Signatory title</label>
  <input id="bz-signatoryTitle" class="form-input" maxlength="100" placeholder="e.g. Founder, CEO" value="${esc(b.own.signatoryTitle)}" ${dis} />
</div>
<div style="max-width:320px;">${imageBlock(b, 'signature')}</div>

${parent ? `${sectionTitle('Status')}
<label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--gray-800);">
  <input type="checkbox" id="bz-active" ${b.active ? 'checked' : ''} ${dis} /> Active (inactive businesses cannot get new people or certificates)
</label>` : ''}

${canEdit ? `<div style="margin-top:22px;display:flex;align-items:center;gap:12px;">
  <button class="btn-primary" id="bz-save" style="width:auto;padding:11px 26px;font-size:0.9rem;">Save changes</button>
  <span id="bz-msg" style="font-size:0.82rem;color:var(--red);"></span>
</div>` : ''}

${sectionTitle('🔒 Change history')}
<div id="bz-log" style="font-size:0.78rem;color:var(--gray-500);">Loading…</div>`;

  document.getElementById('bz-copy')?.addEventListener('click', async () => {
    const link = document.getElementById('bz-link')?.textContent || '';
    try { await navigator.clipboard.writeText(link); showToast('✅ Link copied'); }
    catch { showToast('Copy failed — select the link and copy it manually', 'error'); }
  });

  if (canEdit) wireEditor(b);
  loadLog(b.id);
}

function wireEditor(b) {
  // colour picker <-> text
  const picker = document.getElementById('bz-brandColor-picker');
  const hex = document.getElementById('bz-brandColor');
  picker.addEventListener('input', () => { hex.value = picker.value; });
  hex.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) picker.value = hex.value; });

  document.getElementById('bz-save').addEventListener('click', async () => {
    const btn = document.getElementById('bz-save');
    const msg = document.getElementById('bz-msg');
    msg.textContent = '';
    const val = id => document.getElementById(id).value;
    const payload = { id: b.id, displayName: val('bz-displayName') };
    for (const k of ['legalName', 'tagline', 'website', 'email', 'address', 'brandColor', 'signatoryName', 'signatoryTitle']) {
      payload[k] = val(`bz-${k}`).trim() === '' ? null : val(`bz-${k}`);
    }
    payload.products = val('bz-products').split('\n').map(s => s.trim()).filter(Boolean);
    if (!payload.products.length) payload.products = null;
    const active = document.getElementById('bz-active');
    if (active) payload.active = active.checked;

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await adminUpdateBusiness(token, payload);
      showToast(res.changed?.length ? `✅ Saved (${res.changed.map(f => FIELD_LABELS[f] || f).join(', ')})` : 'Nothing changed');
      await reload();
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  });

  document.querySelectorAll('[data-image-kind]').forEach(input => input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { showToast('❌ Use a PNG, JPG or WebP image', 'error'); return; }
    if (file.size > 1024 * 1024) { showToast('❌ Image must be under 1 MB', 'error'); return; }
    try {
      showToast('Uploading…');
      await adminSetBusinessImage(token, b.id, input.dataset.imageKind, file);
      showToast('✅ Image updated');
      await reload();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  }));

  document.querySelectorAll('[data-image-clear]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await adminClearBusinessImage(token, b.id, btn.dataset.imageClear);
      showToast('Image removed');
      await reload();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  }));
}

async function loadLog(id) {
  const el = document.getElementById('bz-log');
  try {
    const logs = await adminGetBusinessLog(token, id);
    if (!el) return;
    el.innerHTML = logs.length
      ? logs.slice(0, 15).map(l => `<div style="padding:3px 0;border-bottom:1px solid var(--gray-100);">${esc(new Date(l.at).toLocaleString('en-IN'))} · <strong>${esc(l.role)}</strong> ${esc(ACTION_LABELS[l.action] || l.action)} ${esc(l.fields.map(f => FIELD_LABELS[f] || f).join(', '))}</div>`).join('')
      : 'No changes recorded yet.';
  } catch { if (el) el.textContent = 'History is visible to admin / HR only.'; }
}

// ─── Add business ─────────────────────────────────────────────────────────────
function openAddModal() {
  if (!canEdit) { showToast('Only admin or HR can add a business', 'error'); return; }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-biz-modal';
  const parents = businesses.filter(b => b.active);
  overlay.innerHTML = `
<div class="modal-box" style="max-width:460px;">
  <div class="modal-header">
    <h2 class="modal-title">+ Add Business</h2>
    <button class="modal-close" id="add-biz-close">✕</button>
  </div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Business name <span class="req">*</span></label>
      <input id="nb-name" class="form-input" placeholder="e.g. WaveSeed Growth" maxlength="80" /></div>
    <div class="form-group"><label class="form-label">Code <span class="req">*</span></label>
      <input id="nb-code" class="form-input" placeholder="e.g. WSG" maxlength="6" style="text-transform:uppercase;" />
      <div style="font-size:0.74rem;color:var(--gray-500);margin-top:4px;">2–6 capital letters. Appears in every ID (e.g. <span style="font-family:monospace;">WSG-INT-${new Date().getFullYear()}-0001</span>). <strong>Cannot be changed later.</strong></div></div>
    <div class="form-group"><label class="form-label">Under</label>
      <select id="nb-parent" class="form-select">${parents.map(p => `<option value="${esc(p.id)}" ${!p.parentId ? 'selected' : ''}>${esc(p.displayName)} (${esc(p.code)})</option>`).join('')}</select></div>
    <p id="nb-err" style="color:var(--red);font-size:0.82rem;min-height:18px;"></p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" id="add-biz-cancel">Cancel</button>
    <button class="btn-primary" id="nb-save" style="width:auto;padding:10px 22px;">Create</button>
  </div>
</div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('add-biz-close').addEventListener('click', close);
  document.getElementById('add-biz-cancel').addEventListener('click', close);
  document.getElementById('nb-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

  document.getElementById('nb-save').addEventListener('click', async () => {
    const err = document.getElementById('nb-err');
    err.textContent = '';
    const btn = document.getElementById('nb-save');
    btn.disabled = true;
    try {
      const res = await adminCreateBusiness(token, {
        displayName: document.getElementById('nb-name').value,
        code: document.getElementById('nb-code').value,
        parentId: document.getElementById('nb-parent').value,
      });
      close();
      showToast(`✅ ${res.code} created`);
      selectedId = res.id;
      await reload();
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
    }
  });
}
