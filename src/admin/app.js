// ─── app.js — admin application shell ─────────────────────────────────────────
// Sidebar + top bar + mobile navigation + router. Pages are loaded on demand and mounted
// into #view. A page is a function  mount(el, ctx) -> optional cleanup().
import { icon } from '../ui/icons.js';
import { esc, avatar, toast } from '../ui/components.js';
import { session, can, landingFor, ROLE_LABEL, data, load, invalidate, getScope, setScope, scopedBusiness, parentBusiness,
         onChange, AuthError, peopleInScope, certsInScope, progressOf } from './state.js';
import { parse, go, href } from './router.js';
import { renderLogin } from './login.js';
import { openPalette } from './palette.js';
import { docType } from '../utils/docTypes.js';

const PAGES = {
  home:      () => import('./pages/home.js').then(m => m.default),
  people:    () => import('./pages/legacy.js').then(m => m.peoplePage),
  person:    () => import('./pages/person.js').then(m => m.default),
  documents: () => import('./pages/legacy.js').then(m => m.documentsPage),
  create:    () => import('./pages/create.js').then(m => m.default),
  reports:   () => import('./pages/legacy.js').then(m => m.reportsPage),
  settings:  () => import('./pages/legacy.js').then(m => m.settingsPage),
};

const TITLES = { home: 'Home', people: 'People', documents: 'Documents', create: 'Create', reports: 'Reports', settings: 'Settings' };

let app = null;            // #app element
let unmountPage = null;    // cleanup returned by the current page
let hashHandler = null;
let keyHandler = null;     // Ctrl/Cmd+K
let unsubscribe = null;    // data/scope change subscription
let navToken = 0;

// ── Entry ────────────────────────────────────────────────────────────────────
export function initAdminApp(el) {
  app = el;
  if (hashHandler) window.removeEventListener('hashchange', hashHandler);
  if (!session.token) return showLogin();
  mountShell();
}

function showLogin() {
  teardown();
  renderLogin(app, () => { go(landingFor(session.role), '', { replace: true }); mountShell(); });
}

async function signOut() {
  teardown();
  await session.end();
  showLogin();
}

function teardown() {
  if (unmountPage) { try { unmountPage(); } catch { /* page already gone */ } unmountPage = null; }
  if (hashHandler) { window.removeEventListener('hashchange', hashHandler); hashHandler = null; }
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

// ── Shell ────────────────────────────────────────────────────────────────────
function pendingCounts() {
  const people = peopleInScope().filter(e => e.status !== 'former');
  const incomplete = people.filter(e => { const p = progressOf(e); return p.done < p.total; }).length;
  const awaitingSigned = certsInScope().filter(c => /offer/.test(c.certificateType) && !c.signedUrl && c.status === 'active').length;
  return { incomplete, awaitingSigned };
}

function navModel() {
  const p = can(session.role);
  const { incomplete } = pendingCounts();
  const groups = [
    { label: '', items: [p.home && { id: 'home', label: 'Home', icon: 'dashboard' }] },
    { label: 'Manage', items: [
      p.people && { id: 'people', label: 'People', icon: 'users', count: incomplete, legacyId: 'nav-employees' },
      p.documents && { id: 'documents', label: 'Documents', icon: 'files', legacyId: 'nav-certs' },
      p.create && { id: 'create', label: 'Create', icon: 'wand', legacyId: 'nav-generate' },
    ] },
    { label: 'Insights', items: [p.reports && { id: 'reports', label: 'Reports', icon: 'chart', legacyId: 'nav-reports' }] },
    { label: 'Workspace', items: [p.settings && { id: 'settings', label: 'Settings', icon: 'settings', legacyId: 'nav-settings' }] },
  ];
  return groups.map(g => ({ ...g, items: g.items.filter(Boolean) })).filter(g => g.items.length);
}

function mountShell() {
  teardown();
  app.className = 'ws-app';
  document.body.style.background = 'var(--bg)';
  const collapsed = (() => { try { return localStorage.getItem('ws_sidebar') === '1'; } catch { return false; } })();
  app.innerHTML = `
<div class="shell${collapsed ? ' is-collapsed' : ''}" id="shell">
  <aside class="sidebar" id="sidebar" aria-label="Main navigation">
    <div class="sb-brand">
      <img src="/favicon.svg" alt="">
      <div><b>WaveSeed</b><span>Admin</span></div>
      <button class="btn btn--ghost btn-icon btn-sm sb-collapse" id="sb-collapse" aria-label="Collapse sidebar" title="Collapse sidebar">${icon('panel-left-close')}</button>
    </div>
    <button class="scope-btn" id="scope-btn" aria-haspopup="menu" title="Switch business"></button>
    <nav class="nav" id="nav"></nav>
    <div class="sb-foot">
      <div class="user-box">
        ${avatar(ROLE_LABEL[session.role] || 'Admin')}
        <div class="user-text"><b>${esc(ROLE_LABEL[session.role] || 'Admin')}</b><small>Signed in</small></div>
        <button class="btn btn--ghost btn-icon btn-sm" id="sign-out" style="color:#9fb0d4" aria-label="Sign out" title="Sign out">${icon('log-out')}</button>
      </div>
    </div>
  </aside>
  <div class="drawer-backdrop" id="drawer-backdrop"></div>

  <div class="main">
    <header class="topbar">
      <button class="btn btn--ghost btn-icon show-mobile-only" id="open-drawer" aria-label="Open menu" style="display:none">${icon('menu')}</button>
      <div class="topbar-title" id="crumbs"></div>
      <button class="search-trigger" id="open-palette" aria-label="Search">${icon('search', { size: 17 })}<span>Search people, documents, pages…</span><kbd class="kbd">Ctrl K</kbd></button>
      <div class="topbar-actions">
        ${can(session.role).create ? `<button class="btn btn--primary hide-sm" id="new-btn">${icon('plus')} New</button>` : ''}
        <button class="btn btn--ghost btn-icon bell" id="bell" aria-label="Notifications">${icon('bell')}<i id="bell-dot" hidden></i></button>
      </div>
    </header>
    <main class="content" id="view" tabindex="-1"></main>
  </div>

  <nav class="mobile-nav" id="mobile-nav" aria-label="Quick navigation"></nav>
</div>
<style>@media (max-width: 900px){ .show-mobile-only{ display:inline-flex !important; } }</style>`;

  const shell = app.querySelector('#shell');
  const $ = (s) => app.querySelector(s);

  // Collapse / drawer
  $('#sb-collapse').addEventListener('click', () => {
    shell.classList.toggle('is-collapsed');
    try { localStorage.setItem('ws_sidebar', shell.classList.contains('is-collapsed') ? '1' : '0'); } catch { /* ignore */ }
  });
  const closeDrawer = () => shell.classList.remove('drawer-open');
  $('#open-drawer').addEventListener('click', () => shell.classList.add('drawer-open'));
  $('#drawer-backdrop').addEventListener('click', closeDrawer);
  $('#sidebar').addEventListener('click', (e) => { if (e.target.closest('.nav-item')) closeDrawer(); });

  $('#sign-out').addEventListener('click', signOut);
  $('#open-palette').addEventListener('click', () => openPalette({ go }));
  $('#scope-btn').addEventListener('click', (e) => openScopeMenu(e.currentTarget));
  $('#new-btn')?.addEventListener('click', (e) => openNewMenu(e.currentTarget));
  $('#bell').addEventListener('click', (e) => openBellMenu(e.currentTarget));

  keyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette({ go }); }
  };
  document.addEventListener('keydown', keyHandler);

  hashHandler = () => {
    if (!window.location.hash.startsWith('#admin')) return;   // user left the admin area
    renderRoute();
  };
  window.addEventListener('hashchange', hashHandler);

  unsubscribe = onChange((what) => { if (what === 'scope') { renderChrome(); renderRoute(); } else if (what === 'data') renderChrome(); });

  renderChrome();
  boot();
}

async function boot() {
  const view = app.querySelector('#view');
  view.innerHTML = '<div class="col" style="padding:8px 0">' + Array.from({ length: 3 }, () => '<div class="skeleton" style="height:96px"></div>').join('') + '</div>';
  try {
    await load({ force: true });
  } catch (err) {
    if (err instanceof AuthError) { toast('Your session has expired. Please sign in again.', { type: 'warn', title: 'Signed out' }); await session.end(); return showLogin(); }
  }
  // A scope that no longer exists (business removed) falls back to "all"
  if (getScope() && !scopedBusiness()) setScope('');
  renderChrome();
  if (!parse().section) go(landingFor(session.role), '', { replace: true }); else renderRoute();
}

// Sidebar, scope button, bell dot and mobile nav reflect current data
function renderChrome() {
  if (!app?.querySelector('#nav')) return;
  const here = parse();
  const section = here.id && here.section === 'people' ? 'people' : here.section;
  const groups = navModel();

  app.querySelector('#nav').innerHTML = groups.map(g => `
    ${g.label ? `<div class="nav-label">${esc(g.label)}</div>` : ''}
    ${g.items.map(i => `<a class="nav-item" ${i.legacyId ? `id="${i.legacyId}"` : ''} href="${href(i.id)}" ${section === i.id ? 'aria-current="page"' : ''} title="${esc(i.label)}">${icon(i.icon, { size: 19 })}<span>${esc(i.label)}</span>${i.count ? `<em class="nav-count" style="font-style:normal">${i.count}</em>` : ''}</a>`).join('')}`).join('') + `
    <div class="nav-label">Public pages</div>
    <a class="nav-item" href="/" target="_blank" rel="noopener">${icon('shield-check', { size: 19 })}<span>Verification page</span>${icon('external-link', { size: 14 })}</a>
    <a class="nav-item" href="${onboardLink()}" target="_blank" rel="noopener">${icon('user-plus', { size: 19 })}<span>Onboarding form</span>${icon('external-link', { size: 14 })}</a>
    <a class="nav-item" href="#upload" target="_blank" rel="noopener">${icon('cloud-upload', { size: 19 })}<span>Document upload</span>${icon('external-link', { size: 14 })}</a>`;

  const b = scopedBusiness();
  app.querySelector('#scope-btn').innerHTML = `
    <span class="scope-chip ${b ? '' : 'scope-chip--all'}">${b ? esc(b.code) : icon('layers', { size: 16 })}</span>
    <span class="scope-text"><small>Viewing</small><b>${esc(b ? b.displayName : 'All businesses')}</b></span>
    ${data.businesses.length > 1 ? icon('chevrons-up-down', { size: 16 }) : ''}`;

  const { incomplete, awaitingSigned } = pendingCounts();
  const dot = app.querySelector('#bell-dot'); if (dot) dot.hidden = !(incomplete + awaitingSigned);

  const p = can(session.role);
  const items = [
    p.home && { id: 'home', label: 'Home', icon: 'dashboard' },
    p.people && { id: 'people', label: 'People', icon: 'users', dot: incomplete > 0 },
    p.create && { id: 'create', label: 'Create', icon: 'plus', fab: true },
    p.documents && { id: 'documents', label: 'Docs', icon: 'files' },
    p.settings ? { id: 'settings', label: 'Settings', icon: 'settings' } : p.reports ? { id: 'reports', label: 'Reports', icon: 'chart' } : null,
  ].filter(Boolean);
  app.querySelector('#mobile-nav').style.gridTemplateColumns = `repeat(${items.length}, 1fr)`;
  app.querySelector('#mobile-nav').innerHTML = items.map(i => i.fab
    ? `<a class="mnav-item mnav-create" href="${href(i.id)}" aria-label="Create"><span class="fab">${icon('plus', { size: 22 })}</span></a>`
    : `<a class="mnav-item" href="${href(i.id)}" ${section === i.id ? 'aria-current="page"' : ''}>${icon(i.icon, { size: 22 })}${i.label}${i.dot ? '<span class="badge-dot"></span>' : ''}</a>`).join('');
}

function onboardLink() {
  const b = scopedBusiness() || parentBusiness();
  return `${location.pathname}#onboard${b ? '/' + b.code.toLowerCase() : ''}`;
}

// ── Routing ──────────────────────────────────────────────────────────────────
async function renderRoute() {
  if (!app?.querySelector('#view')) return;
  const token = ++navToken;
  const { section: s0, id } = parse();
  const p = can(session.role);
  let section = s0 || landingFor(session.role);
  if (!p[section]) { section = landingFor(session.role); go(section, '', { replace: true }); return; }

  const key = section === 'people' && id ? 'person' : section;
  if (unmountPage) { try { unmountPage(); } catch { /* ignore */ } unmountPage = null; }
  // Every page gets a brand-new container. Pages attach click handlers to it; reusing the same
  // element would leave the previous pages' handlers alive and fire them on later clicks
  // (that once let a stale "Issue" handler save a document from a page already left).
  const old = app.querySelector('#view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  view.className = 'content';
  view.innerHTML = '<div class="col" style="padding:8px 0">' + Array.from({ length: 3 }, () => '<div class="skeleton" style="height:84px"></div>').join('') + '</div>';
  renderChrome();
  renderCrumbs(section, id);
  document.title = `${TITLES[section] || 'Admin'} — WaveSeed Admin`;
  window.scrollTo(0, 0);

  try {
    const mount = await PAGES[key]();
    if (token !== navToken) return;
    view.innerHTML = '';
    // restart the entrance animation
    view.className = ''; void view.offsetWidth; view.className = 'content';
    const ctx = { id, data, go, toast, can: p, role: session.role, token: session.token, scope: getScope(), refresh: async () => { invalidate(); await load({ force: true }); renderChrome(); } };
    unmountPage = (await mount(view, ctx)) || null;
    view.focus({ preventScroll: true });
  } catch (err) {
    console.error('Page failed', key, err);
    if (token !== navToken) return;
    view.innerHTML = `<div class="card">${'<div class="empty"><span class="chip-icon chip-icon--rose">' + icon('alert-triangle', { size: 26 }) + '</span><h3>This page could not be loaded</h3><p>Please try again. If it keeps happening, reload the page.</p></div>'}</div>`;
  }
}

function renderCrumbs(section, id) {
  const el = app.querySelector('#crumbs');
  if (section === 'people' && id) {
    const emp = data.employees.find(e => e._id === id);
    el.innerHTML = `<div class="crumbs"><a href="${href('people')}">People</a>${icon('chevron-right', { size: 14 })}<b>${esc(emp ? emp.name : 'Profile')}</b></div>`;
  } else if (section === 'create' && id && docType(id)) {
    el.innerHTML = `<div class="crumbs"><a href="${href('create')}">Create</a>${icon('chevron-right', { size: 14 })}<b>${esc(docType(id).name)}</b></div>`;
  } else {
    el.innerHTML = `<div class="crumbs"><b>${esc(TITLES[section] || 'Admin')}</b></div>`;
  }
}

// ── Menus ────────────────────────────────────────────────────────────────────
function popMenu(anchor, html, { align = 'left', onPick } = {}) {
  document.querySelector('.menu[data-pop]')?.remove();
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('data-pop', ''); m.setAttribute('role', 'menu');
  m.innerHTML = html;
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth;
  let left = align === 'right' ? r.right - w : r.left;
  left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
  m.style.left = left + 'px';
  m.style.top = Math.min(r.bottom + 8, window.innerHeight - m.offsetHeight - 10) + 'px';
  const close = () => { m.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc_); };
  const outside = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  setTimeout(() => { document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc_); }, 0);
  m.addEventListener('click', (e) => { const it = e.target.closest('[data-pick]'); if (!it) return; close(); onPick && onPick(it.dataset.pick); });
  m.querySelector('[data-pick]')?.focus();
  return close;
}

function openScopeMenu(anchor) {
  if (data.businesses.length < 2) return;
  const cur = getScope();
  const biz = data.businesses.filter(b => b.active);
  const parent = biz.find(b => !b.parentId);
  const row = (id, chip, name, sub) => `<button class="menu-item" role="menuitem" data-pick="${esc(id)}" style="${cur === id ? 'background:var(--navy-50)' : ''}"><span class="scope-chip ${id ? '' : 'scope-chip--all'}" style="width:28px;height:28px;font-size:10px">${chip}</span><span style="flex:1;text-align:left"><b style="display:block;font-weight:600">${esc(name)}</b><small class="muted">${esc(sub)}</small></span>${cur === id ? icon('check', { size: 16 }) : ''}</button>`;
  popMenu(anchor, `<div class="menu-label">Switch business</div>
    ${row('', icon('layers', { size: 14 }), 'All businesses', 'Everything, combined')}
    ${biz.map(b => row(b.id, esc(b.code), b.displayName, b.id === parent?.id ? 'Parent company' : 'Venture')).join('')}
    ${can(session.role).settings ? `<div class="menu-sep"></div><button class="menu-item" role="menuitem" data-pick="__manage">${icon('settings')} Manage businesses</button>` : ''}`,
    { onPick: (v) => { if (v === '__manage') go('settings'); else setScope(v); } });
}

function openNewMenu(anchor) {
  popMenu(anchor, `<div class="menu-label">Create</div>
    <button class="menu-item" data-pick="person">${icon('user-plus')} Add a person</button>
    <button class="menu-item" data-pick="doc">${icon('file-plus')} Issue a certificate or letter</button>`,
    { align: 'right', onPick: (v) => {
      if (v === 'doc') go('create');
      else { go('people'); setTimeout(() => document.getElementById('btn-add-employee')?.click(), 400); }
    } });
}

function openBellMenu(anchor) {
  const { incomplete, awaitingSigned } = pendingCounts();
  const none = !(incomplete + awaitingSigned);
  popMenu(anchor, `<div class="menu-label">Needs attention</div>
    ${none ? `<div class="muted" style="padding:10px 12px">You're all caught up.</div>` : ''}
    ${incomplete ? `<button class="menu-item" data-pick="people">${icon('file-warning')}<span style="flex:1;text-align:left">${incomplete} ${incomplete === 1 ? 'person has' : 'people have'} missing documents</span></button>` : ''}
    ${awaitingSigned ? `<button class="menu-item" data-pick="documents">${icon('signature')}<span style="flex:1;text-align:left">${awaitingSigned} offer ${awaitingSigned === 1 ? 'letter' : 'letters'} awaiting a signed copy</span></button>` : ''}`,
    { align: 'right', onPick: (v) => go(v) });
}
