// ─── businesses.js — shared helpers for business-aware admin screens ──────────
import { adminGetBusinesses } from '../api.js';

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** All businesses (empty list if the call fails, so screens still work single-business). */
export async function loadBusinessList(token) {
  try { return (await adminGetBusinesses(token)).businesses || []; } catch { return []; }
}

export const parentBusiness = list => list.find(b => !b.parentId) || null;

/** The business a record belongs to. Legacy records without a businessId belong to the parent company. */
export function bizOf(list, businessId) {
  return list.find(b => b.id === businessId) || parentBusiness(list);
}

export function bizBadge(list, businessId) {
  const b = bizOf(list, businessId);
  if (!b) return '<span style="color:var(--gray-400);">—</span>';
  return `<span title="${esc(b.displayName)}" style="font-family:monospace;font-weight:700;font-size:0.75rem;color:var(--gold-dark);background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:2px 7px;">${esc(b.code)}</span>`;
}

/** Fill a <select> with "All businesses" + one option per active business. Hidden if there is only one. */
export function fillBusinessFilter(selectEl, list) {
  if (!selectEl) return;
  const active = list.filter(b => b.active);
  selectEl.innerHTML = '<option value="">All Businesses</option>' +
    active.map(b => `<option value="${esc(b.id)}">${esc(b.displayName)} (${esc(b.code)})</option>`).join('');
  selectEl.style.display = active.length > 1 ? '' : 'none';
}

/** True if the record belongs to the selected business id ('' = all). Legacy rows count as the parent. */
export function matchesBusiness(list, businessId, selectedId) {
  if (!selectedId) return true;
  const b = bizOf(list, businessId);
  return !!b && b.id === selectedId;
}

/** Product list for a business (by id; legacy rows -> parent). null = unknown, caller falls back to the built-in list. */
export function productsOf(list, businessId) {
  const b = bizOf(list, businessId);
  return b && b.effective && Array.isArray(b.effective.products) ? b.effective.products : null;
}

/** Same, by business code. */
export function productsByCode(list, code) {
  const b = list.find(x => x.code === code);
  return b && b.effective && Array.isArray(b.effective.products) ? b.effective.products : null;
}
