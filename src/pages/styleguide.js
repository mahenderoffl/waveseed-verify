// ─── styleguide.js — living reference for the design system (route: #ui) ──────
import { icon, iconNames } from '../ui/icons.js';
import { avatar, badge, button, kpi, empty, skeletonRows, toast, openModal, onAction } from '../ui/components.js';

const SWATCHES = [
  ['ink-900', '#0b1633'], ['navy-800', '#12224a'], ['navy-700', '#1b3170'], ['navy-600', '#27438f'],
  ['gold-500', '#c9a227'], ['gold-300', '#e4c15a'], ['teal-500', '#00a387'], ['violet-500', '#7a5af8'],
  ['blue-500', '#2e7cf6'], ['amber-500', '#f59e0b'], ['green-500', '#12b76a'], ['rose-500', '#f04438'],
  ['bg', '#f4f6fb'], ['surface-3', '#eef1f8'], ['line', '#e4e8f1'], ['ink-2', '#475270'],
];

export function initStyleGuidePage(app) {
  app.className = 'ws-app';
  document.body.style.background = 'var(--bg)';
  app.innerHTML = `
<div class="sg">
  <div class="row between wrap">
    <div class="row gap-3"><img src="/favicon.svg" width="44" height="44" alt=""><div><h1 style="font-size:24px">WaveSeed design system</h1><div class="muted">Premium &amp; calm, with modern vibrant accents.</div></div></div>
    <div class="row gap-2">${button('Back to app', { href: '#admin', icon: 'arrow-left' })}</div>
  </div>

  <h2>Colour</h2>
  <div class="sg-swatches">${SWATCHES.map(([n, c]) => `<div class="sg-swatch"><i style="background:${c}"></i><span>${n}<br>${c}</span></div>`).join('')}</div>

  <h2>Typography</h2>
  <div class="card card-pad col">
    <div style="font:800 40px/1.1 var(--font-display)">Seeding the next wave<span style="color:var(--gold-500)">.</span></div>
    <div style="font-size:24px;font-weight:700;letter-spacing:-.02em">Heading — Inter 700</div>
    <div style="font-size:16px;font-weight:600">Subheading — Inter 600</div>
    <div>Body text in Inter 14px. Interns and employees upload their documents securely and HR verifies them.</div>
    <div class="muted">Muted helper text · <span class="mono">WS-INT-2026-0003</span> · <span class="tnum">1,234,567</span></div>
  </div>

  <h2>Buttons</h2>
  <div class="card card-pad col">
    <div class="row wrap">${button('Primary', { variant: 'primary', icon: 'plus' })}${button('Accent', { variant: 'accent', icon: 'sparkles' })}${button('Secondary', { icon: 'download' })}${button('Ghost', { variant: 'ghost' })}${button('Danger', { variant: 'danger', icon: 'trash' })}${button('Success', { variant: 'success', icon: 'check' })}</div>
    <div class="row wrap">${button('Small', { variant: 'primary', size: 'sm' })}${button('Large', { variant: 'primary', size: 'lg', icon: 'rocket' })}${button('', { iconOnly: true, icon: 'settings', title: 'Settings' })}${button('', { iconOnly: true, variant: 'primary', icon: 'search', title: 'Search' })}<button class="btn btn--primary is-loading">Saving</button><button class="btn" disabled>Disabled</button></div>
  </div>

  <h2>Form fields</h2>
  <div class="card card-pad sg-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
    <div class="field"><label>Full name <span class="req">*</span></label><input class="input" placeholder="e.g. Priya Nair"></div>
    <div class="field"><label>Email</label><div class="input-affix">${icon('mail')}<input class="input" placeholder="name@company.com"></div></div>
    <div class="field"><label>Role</label><select class="select"><option>Intern</option><option>Employee</option></select></div>
    <div class="field has-error"><label>Reference number</label><input class="input" aria-invalid="true" value="WS/INT/??"><div class="field-error">${icon('alert-circle', { size: 14 })} Reference not found</div></div>
    <div class="field" style="grid-column:1/-1"><label>Notes</label><textarea class="textarea" placeholder="Anything HR should know"></textarea><div class="field-hint">Visible to admin and HR only.</div></div>
    <label class="check"><input type="checkbox" checked> Send me a copy</label>
    <label class="row gap-3"><span class="switch"><input type="checkbox" checked><span></span></span> Active</label>
  </div>

  <h2>Badges &amp; chips</h2>
  <div class="card card-pad row wrap">
    ${badge('Verified', { variant: 'green', dot: true })}${badge('Pending', { variant: 'amber', dot: true })}${badge('Revoked', { variant: 'rose', dot: true })}${badge('Intern', { variant: 'teal' })}${badge('Employee', { variant: 'violet' })}${badge('WSG', { variant: 'gold', code: true })}${badge('3 of 5', { variant: 'blue', icon: 'file-check' })}${badge('Draft')}
    <span class="chip-icon chip-icon--teal">${icon('users', { size: 20 })}</span><span class="chip-icon chip-icon--violet">${icon('award', { size: 20 })}</span><span class="chip-icon chip-icon--amber">${icon('clock', { size: 20 })}</span><span class="chip-icon chip-icon--rose">${icon('alert-triangle', { size: 20 })}</span>
    ${avatar('Priya Nair', 'sm')}${avatar('Shaik Shareef')}${avatar('Mahender Banoth', 'lg')}${avatar('Bathini Srinath', 'xl')}
  </div>

  <h2>KPI cards</h2>
  <div class="sg-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
    ${kpi({ label: 'People', value: '7', hint: 'across 2 businesses', icon: 'users', tone: 'teal' })}
    ${kpi({ label: 'Certificates issued', value: '16', hint: 'this year', icon: 'award', tone: 'violet', trend: '+3' })}
    ${kpi({ label: 'Documents pending', value: '7', hint: 'people incomplete', icon: 'file-warning', tone: 'amber' })}
    ${kpi({ label: 'Verifications', value: '20', hint: 'all time', icon: 'shield-check', tone: 'green' })}
  </div>

  <h2>Table</h2>
  <div class="card"><div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Person</th><th>Business</th><th>Documents</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <tr><td><div class="cell-person">${avatar('Muskan Lalwani')}<div><b>Muskan Lalwani</b><small class="mono">WS-INT-2026-0006</small></div></div></td><td>${badge('WS', { variant: 'gold', code: true })}</td><td>${badge('0 / 5', { variant: 'amber', icon: 'alert-triangle' })}</td><td>${badge('Active', { variant: 'green', dot: true })}</td><td style="text-align:right">${button('', { iconOnly: true, size: 'sm', variant: 'ghost', icon: 'more', title: 'More' })}</td></tr>
      <tr><td><div class="cell-person">${avatar('Mahender Banoth')}<div><b>Mahender Banoth</b><small class="mono">WS-EMP-2026-0001</small></div></div></td><td>${badge('WS', { variant: 'gold', code: true })}</td><td>${badge('6 / 6', { variant: 'green', icon: 'check' })}</td><td>${badge('Active', { variant: 'green', dot: true })}</td><td style="text-align:right">${button('', { iconOnly: true, size: 'sm', variant: 'ghost', icon: 'more', title: 'More' })}</td></tr>
    </tbody></table></div></div>

  <h2>Tabs, segmented, callouts, progress</h2>
  <div class="card card-pad col">
    <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">${icon('user')} Overview</button><button class="tab" role="tab" aria-selected="false">${icon('files')} Documents</button><button class="tab" role="tab" aria-selected="false">${icon('award')} Certificates</button><button class="tab" role="tab" aria-selected="false">${icon('history')} Activity</button></div>
    <div class="segmented"><button aria-pressed="true">All</button><button aria-pressed="false">Interns</button><button aria-pressed="false">Employees</button></div>
    <div class="callout callout--amber">${icon('alert-triangle')}<div><b>Missing documents</b><br>Government ID · 10th marksheet · 12th marksheet</div></div>
    <div class="callout callout--green">${icon('circle-check')}<div>All required documents received.</div></div>
    <div class="progress"><i style="width:62%"></i></div>
    <div class="stepper"><div class="step is-done"><span class="step-dot">${icon('check', { size: 14 })}</span>Personal</div><span class="step-line is-done"></span><div class="step" aria-current="step"><span class="step-dot">2</span>Academic</div><span class="step-line"></span><div class="step"><span class="step-dot">3</span>Role</div></div>
  </div>

  <h2>Empty, loading</h2>
  <div class="sg-grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
    <div class="card">${empty({ icon: 'inbox', title: 'Nothing here yet', text: 'When people upload documents they will show up here.', tone: 'teal', action: button('Add a person', { variant: 'primary', icon: 'user-plus' }) })}</div>
    <div class="card card-pad">${skeletonRows(4)}</div>
  </div>

  <h2>Feedback &amp; overlays</h2>
  <div class="card card-pad row wrap">
    ${button('Success toast', { action: 'toast-ok' })}${button('Error toast', { action: 'toast-err' })}${button('Warning toast', { action: 'toast-warn' })}${button('Open modal', { variant: 'primary', action: 'modal' })}
  </div>

  <h2>Icons (${iconNames().length})</h2>
  <div class="sg-icons">${iconNames().map(n => `<div>${icon(n, { size: 22 })}<span>${n}</span></div>`).join('')}</div>
</div>`;

  onAction(app, {
    'toast-ok':   () => toast('Certificate saved and linked to the person.', { type: 'success', title: 'Saved' }),
    'toast-err':  () => toast('The reference number could not be found.', { type: 'error', title: 'Something went wrong' }),
    'toast-warn': () => toast('2 documents are still missing.', { type: 'warn', title: 'Heads up' }),
    'modal': () => openModal({
      title: 'Add person',
      body: '<div class="col"><div class="field"><label>Full name</label><input class="input" placeholder="e.g. Priya Nair"></div><div class="field"><label>Business</label><select class="select"><option>WaveSeed Co. (WS)</option><option>WaveSeed Growth (WSG)</option></select></div></div>',
      footer: `${button('Cancel', { attrs: 'data-close' })}${button('Create profile', { variant: 'primary', icon: 'check' })}`,
    }),
  });
}
