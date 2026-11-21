// ─── components.js — small HTML builders + toast / modal behaviours ───────────
// Builders return strings (the app renders with innerHTML), so everything that is
// user-provided MUST go through esc() — the builders below do that for you.
import { icon } from './icons.js';

export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ── Avatar: initials on a soft, stable colour derived from the name ───────────
function hueOf(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
export function avatar(name, size = '') {
  return `<span class="avatar${size ? ' avatar--' + size : ''}" style="--_h:${hueOf(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function badge(text, { variant = '', icon: ic = '', dot = false, code = false, title = '' } = {}) {
  const cls = ['badge', variant && `badge--${variant}`, dot && 'badge--dot', code && 'badge--code'].filter(Boolean).join(' ');
  return `<span class="${cls}"${title ? ` title="${esc(title)}"` : ''}>${ic ? icon(ic) : ''}${esc(text)}</span>`;
}

// ── Button (as markup; attach behaviour with data-action + onAction()) ────────
export function button(label, { variant = '', size = '', icon: ic = '', iconOnly = false, action = '', href = '', title = '', attrs = '' } = {}) {
  const cls = ['btn', variant && `btn--${variant}`, size && `btn-${size}`, iconOnly && 'btn-icon'].filter(Boolean).join(' ');
  const inner = `${ic ? icon(ic, { size: size === 'sm' ? 15 : 17 }) : ''}${iconOnly ? '' : esc(label)}`;
  const a = `${action ? ` data-action="${esc(action)}"` : ''}${title || iconOnly ? ` title="${esc(title || label)}" aria-label="${esc(title || label)}"` : ''} ${attrs}`;
  return href ? `<a class="${cls}" href="${esc(href)}"${a}>${inner}</a>` : `<button type="button" class="${cls}"${a}>${inner}</button>`;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
export function kpi({ label, value, hint = '', icon: ic = 'sparkles', tone = 'navy', trend = '' }) {
  return `<div class="card card-pad kpi">
    <div class="row between" style="align-items:flex-start">
      <div class="muted strong" style="font-size:12.5px">${esc(label)}</div>
      <span class="chip-icon chip-icon--${tone}">${icon(ic, { size: 20 })}</span>
    </div>
    <div class="kpi-value tnum">${esc(value)}</div>
    <div class="kpi-hint muted">${trend ? `<span class="kpi-trend">${esc(trend)}</span> ` : ''}${esc(hint)}</div>
  </div>`;
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function empty({ icon: ic = 'inbox', title, text = '', tone = 'navy', action = '' }) {
  return `<div class="empty"><span class="chip-icon chip-icon--${tone}">${icon(ic, { size: 26 })}</span>
    <h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}

export function skeletonRows(n = 5, h = 52) {
  return Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:10px"></div>`).join('');
}

// ── Toasts ────────────────────────────────────────────────────────────────────
const TOAST_ICON = { success: 'circle-check', error: 'circle-x', warn: 'alert-triangle', info: 'info' };
export function toast(message, { type = 'success', title = '', ms = 4200 } = {}) {
  let host = document.querySelector('.ws-toasts');
  if (!host) { host = document.createElement('div'); host.className = 'ws-toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = `ws-toast ws-toast--${type}`;
  el.innerHTML = `${icon(TOAST_ICON[type] || 'info', { size: 20 })}<div>${title ? `<b>${esc(title)}</b>` : ''}<span>${esc(message)}</span></div>`;
  host.appendChild(el);
  const kill = () => { el.style.transition = 'opacity .2s, transform .2s'; el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 200); };
  setTimeout(kill, ms);
  el.addEventListener('click', kill);
  return kill;
}

// ── Modal (returns { el, close }) ─────────────────────────────────────────────
// Closes on Escape and backdrop click, restores focus, traps nothing exotic but keeps
// focus inside by focusing the first field.
export function openModal({ title, body, footer = '', size = '', onClose } = {}) {
  const prevFocus = document.activeElement;
  const el = document.createElement('div');
  el.className = 'ws-modal';
  el.innerHTML = `<div class="ws-modal-panel${size ? ' ws-modal-panel--' + size : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="ws-modal-head"><h2>${esc(title)}</h2><button type="button" class="btn btn--ghost btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="ws-modal-body">${body}</div>${footer ? `<div class="ws-modal-foot">${footer}</div>` : ''}</div>`;
  document.body.appendChild(el);
  const close = () => { document.removeEventListener('keydown', onKey); el.remove(); try { prevFocus && prevFocus.focus(); } catch { /* element gone */ } onClose && onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });
  el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  setTimeout(() => (el.querySelector('input,select,textarea,button:not([data-close])') || el.querySelector('[data-close]'))?.focus(), 30);
  return { el, close };
}

// ── Event delegation: one listener, handlers looked up by data-action ─────────
// onAction(root, { 'open-person': (el, ev) => ... })  — avoids inline onclick handlers.
export function onAction(root, handlers) {
  root.addEventListener('click', ev => {
    const el = ev.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn) fn(el, ev);
  });
}

// ── Tiny formatters ───────────────────────────────────────────────────────────
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '—';
  const x = typeof d === 'number' ? new Date(d) : new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
  return isNaN(x) ? '—' : x.toLocaleDateString('en-IN', opts);
};
export function timeAgo(ts) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  const units = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [sec, u] of units) if (s >= sec) return `${Math.floor(s / sec)}${u} ago`;
  return 'just now';
}
