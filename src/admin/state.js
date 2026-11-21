// ─── state.js — session, permissions, shared data cache, business scope ───────
// One place that knows who is logged in, what they may see, and the data every
// admin page needs. Pages read from here instead of each fetching their own copy.
import {
  adminGetEmployees, adminGetAll, adminGetStats, adminGetDocSummary, adminGetBusinesses, adminLogout, adminGetAcceptances,
} from '../api.js';
import { slotsFor, requirementProgress } from '../utils/docCatalog.js';

const KEY_T = 'ws_admin_token', KEY_R = 'ws_admin_role', KEY_SCOPE = 'ws_scope';

export const ROLE_LABEL = { admin: 'Administrator', hr: 'HR', finance: 'Finance', operations: 'Operations' };

// What each role may open (mirrors the server rules — the server is the real gate).
export const can = (role) => ({
  home:      ['admin', 'hr'].includes(role),
  people:    ['admin', 'hr', 'operations'].includes(role),
  documents: ['admin', 'hr', 'finance'].includes(role),
  create:    ['admin', 'hr', 'operations'].includes(role),
  reports:   ['admin', 'hr'].includes(role),
  settings:  ['admin', 'hr'].includes(role),
  kyc:       ['admin', 'hr'].includes(role),
});

// The page a role lands on after login
export const landingFor = (role) => can(role).home ? 'home' : can(role).documents ? 'documents' : 'people';

export const session = {
  get token() { const t = sessionStorage.getItem(KEY_T); return t && /^[0-9a-f]{64}$/.test(t) ? t : null; },
  get role() { return sessionStorage.getItem(KEY_R) || 'admin'; },
  start(token, role) { sessionStorage.setItem(KEY_T, token); sessionStorage.setItem(KEY_R, role || 'admin'); },
  async end() {
    const t = this.token;
    try { if (t) await adminLogout(t); } catch { /* the server session expires anyway */ }
    sessionStorage.removeItem(KEY_T); sessionStorage.removeItem(KEY_R);
    resetData();
  },
};

// ── Data cache ───────────────────────────────────────────────────────────────
export const data = { businesses: [], employees: [], certs: [], acceptances: [], summary: {}, stats: {}, loadedAt: 0 };
function resetData() { Object.assign(data, { businesses: [], employees: [], certs: [], summary: {}, stats: {}, loadedAt: 0 }); }

const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what) => listeners.forEach(fn => { try { fn(what); } catch (e) { console.error(e); } });

export class AuthError extends Error {}

/** Load everything this role may see. Calls run in parallel; a forbidden call just yields nothing. */
export async function load({ force = false } = {}) {
  if (!force && data.loadedAt && Date.now() - data.loadedAt < 30_000) return data;
  const t = session.token; if (!t) throw new AuthError('No session');
  const p = can(session.role);
  const results = await Promise.allSettled([
    adminGetBusinesses(t),
    p.people ? adminGetEmployees(t) : Promise.resolve([]),
    p.documents ? adminGetAll(t) : Promise.resolve([]),
    p.people ? adminGetDocSummary(t) : Promise.resolve({}),
    adminGetStats(t),
    (p.people || p.documents) ? adminGetAcceptances(t) : Promise.resolve([]),
  ]);
  const [b, e, c, s, st, ac] = results;
  if (b.status === 'rejected' && st.status === 'rejected') throw new AuthError('Session expired');
  data.businesses = b.status === 'fulfilled' ? (b.value.businesses || []) : [];
  data.employees  = e.status === 'fulfilled' ? e.value : [];
  const certs     = c.status === 'fulfilled' ? c.value : [];
  data.certs      = Array.isArray(certs) ? certs : (certs.certificates || []);
  data.summary    = s.status === 'fulfilled' ? s.value : {};
  data.stats      = st.status === 'fulfilled' ? st.value : {};
  data.acceptances = ac.status === 'fulfilled' ? ac.value : [];
  data.loadedAt = Date.now();
  emit('data');
  return data;
}
export const invalidate = () => { data.loadedAt = 0; };

// ── Business scope ("All businesses" or one) ─────────────────────────────────
let scope = '';
try { scope = localStorage.getItem(KEY_SCOPE) || ''; } catch { /* private mode */ }
export const getScope = () => scope;
export function setScope(id) {
  scope = id || '';
  try { localStorage.setItem(KEY_SCOPE, scope); } catch { /* ignore */ }
  emit('scope');
}
export const parentBusiness = () => data.businesses.find(b => !b.parentId) || null;
export const businessOf = (businessId) => data.businesses.find(b => b.id === businessId) || parentBusiness();   // legacy rows -> parent
export const inScope = (businessId) => !scope || (businessOf(businessId)?.id === scope);
export const scopedBusiness = () => data.businesses.find(b => b.id === scope) || null;

// ── Derived helpers shared by pages ──────────────────────────────────────────
export function progressOf(emp) {
  const uploaded = new Set((data.summary[emp._id] || []).map(d => d.docType));
  return requirementProgress(slotsFor(emp.employeeType), t => uploaded.has(t));
}
export const peopleInScope = () => data.employees.filter(e => inScope(e.businessId));
export const certsInScope = () => data.certs.filter(c => inScope(c.businessId));
