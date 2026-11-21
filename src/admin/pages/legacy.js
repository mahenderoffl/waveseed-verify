// ─── legacy.js — mounts the existing (proven) screens inside the new shell ─────
// These are restyled by the design system's compatibility layer. They are replaced one
// by one with redesigned pages; until then they keep every capability working.
function host(el) {
  el.innerHTML = '<div class="legacy-view"></div>';
  return el.firstElementChild;
}

export async function peoplePage(el, ctx) {
  const m = await import('../../pages/employees.js');
  await m.initEmployeesPage(host(el), ctx.token);
}

export async function documentsPage(el, ctx) {
  const m = await import('../../pages/admin.js');
  await m.mountRegistry(host(el), ctx.token, ctx.role);
}

export async function createPage(el, ctx) {
  const m = await import('../../pages/generate.js');
  await m.initGeneratePage(host(el), ctx.token);
}

export async function reportsPage(el, ctx) {
  const m = await import('../../pages/reports.js');
  await m.initReportsPage(host(el), ctx.token);
}

export async function settingsPage(el, ctx) {
  const m = await import('../../pages/settings.js');
  await m.initSettingsPage(host(el), ctx.token);
}
