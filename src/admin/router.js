// ─── router.js — #admin/<section>[/<id>] ──────────────────────────────────────
// Real URLs for every screen: back/forward work, links can be shared, refresh keeps you
// where you were.
//   #admin                 -> landing page for the role
//   #admin/home            #admin/people          #admin/people/<id>
//   #admin/documents       #admin/create[/<type>] #admin/reports    #admin/settings
export const SECTIONS = ['home', 'people', 'documents', 'create', 'reports', 'settings'];

export function parse(hash = window.location.hash) {
  const path = hash.replace(/^#admin\/?/, '').split('?')[0];
  const [section = '', id = ''] = path.split('/').map(decodeURIComponent);
  return { section: SECTIONS.includes(section) ? section : '', id };
}

export function href(section, id = '') {
  return `#admin/${section}${id ? '/' + encodeURIComponent(id) : ''}`;
}

export function go(section, id = '', { replace = false } = {}) {
  const target = href(section, id);
  if (window.location.hash === target) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
  if (replace) history.replaceState(null, '', target); else window.location.hash = target;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}
