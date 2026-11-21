// ─── palette.js — Ctrl/Cmd+K: jump to a person, a document, a page or an action ─
import { icon } from '../ui/icons.js';
import { esc, avatar } from '../ui/components.js';
import { data, can, session, businessOf } from './state.js';

let openEl = null;

const norm = (s) => String(s || '').toLowerCase();

function buildIndex() {
  const p = can(session.role);
  const items = [];
  const pages = [
    p.home && ['home', 'Home', 'Overview and what needs attention', 'dashboard'],
    p.people && ['people', 'People', 'Interns and employees', 'users'],
    p.documents && ['documents', 'Documents', 'Issued certificates and letters', 'files'],
    p.create && ['create', 'Create a document', 'Certificates, offer letters, payslips…', 'wand'],
    p.reports && ['reports', 'Reports', 'Across all businesses', 'chart'],
    p.settings && ['settings', 'Settings', 'Businesses, branding, signatory', 'settings'],
  ].filter(Boolean);
  pages.forEach(([id, title, sub, ic]) => items.push({ group: 'Go to', title, sub, icon: ic, key: norm(title + ' ' + sub), run: (go) => go(id) }));
  if (p.create) items.push({ group: 'Actions', title: 'Add a person', sub: 'Create an intern or employee profile', icon: 'user-plus', key: 'add person new intern employee profile',
    run: (go) => { go('people'); setTimeout(() => document.getElementById('btn-add-employee')?.click(), 400); } });
  if (p.people) data.employees.forEach(e => {
    const biz = businessOf(e.businessId);
    items.push({ group: 'People', title: e.name, sub: [e.empCode, biz && biz.code, e.role].filter(Boolean).join(' · '), avatar: e.name,
      key: norm([e.name, e.empCode, e.email, e.institution, e.role, e.department].join(' ')), run: (go) => go('people', e._id) });
  });
  if (p.documents) data.certs.forEach(c => {
    items.push({ group: 'Documents', title: c.holderName, sub: [c.certificateId, c.certificateType, c.referenceNumber].filter(Boolean).join(' · '), icon: 'file-text',
      key: norm([c.holderName, c.certificateId, c.referenceNumber, c.role].join(' ')),
      run: (go) => { go('documents'); setTimeout(() => { const i = document.getElementById('admin-search'); if (i) { i.value = c.certificateId; i.dispatchEvent(new Event('input')); } }, 500); } });
  });
  return items;
}

export function openPalette({ go }) {
  if (openEl) return;
  const index = buildIndex();
  const el = document.createElement('div');
  el.className = 'palette';
  el.innerHTML = `<div class="palette-panel" role="dialog" aria-modal="true" aria-label="Search">
    <div class="palette-input">${icon('search', { size: 20 })}<input id="pal-q" placeholder="Search people, documents, pages…" autocomplete="off" spellcheck="false"><span class="kbd">Esc</span></div>
    <div class="palette-list" id="pal-list" role="listbox"></div>
    <div class="palette-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> to navigate</span><span><span class="kbd">Enter</span> to open</span></div></div>`;
  document.body.appendChild(el);
  openEl = el;
  const q = el.querySelector('#pal-q'), list = el.querySelector('#pal-list');
  let results = [], sel = 0;

  const close = () => { el.remove(); openEl = null; document.removeEventListener('keydown', onKey, true); };
  const run = (i) => { const it = results[i]; if (!it) return; close(); it.run(go); };

  const render = () => {
    const term = norm(q.value).trim();
    const words = term.split(/\s+/).filter(Boolean);
    results = (words.length ? index.filter(it => words.every(w => it.key.includes(w))) : index.filter(it => it.group === 'Go to' || it.group === 'Actions')).slice(0, 30);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    if (!results.length) { list.innerHTML = `<div class="muted" style="padding:28px;text-align:center">No results for “${esc(q.value)}”.</div>`; return; }
    let html = '', lastGroup = '';
    results.forEach((it, i) => {
      if (it.group !== lastGroup) { html += `<div class="palette-group">${esc(it.group)}</div>`; lastGroup = it.group; }
      html += `<button class="palette-item" role="option" data-i="${i}" aria-selected="${i === sel}">
        ${it.avatar ? avatar(it.avatar, 'sm') : `<span class="chip-icon chip-icon--navy" style="width:32px;height:32px;border-radius:10px">${icon(it.icon, { size: 17 })}</span>`}
        <span style="min-width:0;flex:1"><b style="font-weight:600" class="truncate">${esc(it.title)}</b><small class="truncate">${esc(it.sub)}</small></span></button>`;
    });
    list.innerHTML = html;
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  };
  document.addEventListener('keydown', onKey, true);
  q.addEventListener('input', () => { sel = 0; render(); });
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
  list.addEventListener('mousemove', (e) => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; list.querySelectorAll('.palette-item').forEach((x, i) => x.setAttribute('aria-selected', String(i === sel))); } });
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  render();
  q.focus();
}
