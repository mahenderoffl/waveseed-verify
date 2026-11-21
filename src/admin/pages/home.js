// ─── home.js — the admin landing page ─────────────────────────────────────────
import { icon } from '../../ui/icons.js';
import { esc, avatar, badge, button, kpi, empty, onAction, timeAgo, fmtDate } from '../../ui/components.js';
import { DOC_TYPES } from '../../utils/docCatalog.js';
import {
  ROLE_LABEL, session, data, peopleInScope, certsInScope, progressOf, getScope, setScope, scopedBusiness, businessOf, parentBusiness,
} from '../state.js';
import { href } from '../router.js';

const CERT_LABELS = {
  'internship-cert': 'Internship certificate', 'employment-cert': 'Employment certificate', 'course-cert': 'Course certificate',
  'appreciation-cert': 'Appreciation certificate', 'achievement-cert': 'Achievement certificate', 'volunteer-cert': 'Volunteer certificate',
  'internship-offer': 'Internship offer', 'employment-offer': 'Employment offer', 'experience-letter': 'Experience letter',
  'relieving-letter': 'Relieving letter', 'termination-letter': 'Termination letter', lor: 'Recommendation letter', noc: 'NOC',
  'promotion-letter': 'Promotion letter', 'salary-revision': 'Salary revision', 'salary-slip': 'Salary slip', 'salary-certificate': 'Salary certificate',
  'warning-letter': 'Warning notice', internship: 'Internship certificate', employment: 'Employment certificate', course: 'Course certificate',
};
const certLabel = (t) => CERT_LABELS[t] || String(t || 'Document').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

function monthBuckets(certs, n = 6) {
  const now = new Date();
  const buckets = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), count: 0, now: i === n - 1 };
  });
  for (const c of certs) {
    const d = new Date(c.createdAt || 0);
    const b = buckets.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) b.count++;
  }
  return buckets;
}

export default function mount(el, ctx) {
  const scoped = scopedBusiness();
  const people = peopleInScope().filter(e => e.status !== 'former');
  const certs = certsInScope();

  const rows = people.map(e => ({ e, p: progressOf(e) }));
  const incomplete = rows.filter(r => r.p.done < r.p.total).sort((a, b) => (a.p.done / a.p.total) - (b.p.done / b.p.total));
  const complete = rows.length - incomplete.length;
  const pct = rows.length ? Math.round((complete / rows.length) * 100) : 100;

  const now = new Date();
  const thisMonth = certs.filter(c => { const d = new Date(c.createdAt || 0); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  const verifications = certs.reduce((s, c) => s + (Number(c.verificationCount) || 0), 0);
  const interns = people.filter(p => p.employeeType === 'intern').length;
  const awaitingSigned = certs.filter(c => /offer/.test(c.certificateType) && !c.signedUrl && c.status === 'active');
  const buckets = monthBuckets(certs);
  const maxBar = Math.max(1, ...buckets.map(b => b.count));
  const showBizCards = !getScope() && data.businesses.filter(b => b.active).length > 1;
  const showBizBadge = !getScope() && data.businesses.length > 1;

  // Recent activity: documents issued + documents uploaded
  const activity = [];
  certs.forEach(c => activity.push({ at: c.createdAt || 0, tone: 'violet', icon: 'award', text: `<b>${esc(certLabel(c.certificateType))}</b> issued to ${esc(c.holderName)}`, sub: c.certificateId }));
  people.forEach(e => (data.summary[e._id] || []).forEach(d => { if (d.at) activity.push({ at: d.at, tone: 'teal', icon: 'cloud-upload', text: `<b>${esc(e.name)}</b> uploaded ${esc(DOC_TYPES[d.docType]?.label || d.docType)}`, sub: d.verified ? 'Verified' : 'Awaiting verification' }); }));
  activity.sort((a, b) => b.at - a.at);

  const attnRow = ({ e, p }) => {
    const first = p.missing.slice(0, 2).join(' · ');
    const more = p.missing.length > 2 ? ` +${p.missing.length - 2} more` : '';
    return `<a class="attn-item" href="${href('people', e._id)}">${avatar(e.name)}
      <div class="attn-main"><b class="truncate">${esc(e.name)} ${showBizBadge ? badge(businessOf(e.businessId)?.code || '', { variant: 'gold', code: true }) : ''}</b><small class="truncate">Missing: ${esc(first)}${more}</small></div>
      <div class="attn-meter"><b>${p.done}/${p.total}</b><div class="progress"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div></div>${icon('chevron-right', { size: 16 })}</a>`;
  };

  el.innerHTML = `
<div class="hello">
  <div>
    <h2>${greeting()}, ${esc(ROLE_LABEL[session.role] || 'there')}</h2>
    <p>${esc(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${scoped ? esc(scoped.displayName) : 'All businesses'}</p>
  </div>
  <div class="hello-actions">${button('Add a person', { icon: 'user-plus', action: 'add-person' })}${button('Issue a document', { variant: 'primary', icon: 'file-plus', href: href('create') })}</div>
</div>

<div class="dash-grid">
  <div class="dash-kpis">
    ${kpi({ label: 'People', value: people.length, hint: `${interns} interns · ${people.length - interns} employees`, icon: 'users', tone: 'teal' })}
    ${kpi({ label: 'Documents complete', value: `${pct}%`, hint: incomplete.length ? `${incomplete.length} ${incomplete.length === 1 ? 'person' : 'people'} still missing items` : 'everyone is complete', icon: 'file-check', tone: incomplete.length ? 'amber' : 'green' })}
    ${kpi({ label: 'Issued this month', value: thisMonth, hint: `${certs.length} in total`, icon: 'award', tone: 'violet', trend: thisMonth ? `+${thisMonth}` : '' })}
    ${kpi({ label: 'Verifications', value: verifications, hint: 'by the public, all time', icon: 'shield-check', tone: 'blue' })}
  </div>

  <section class="card dash-attn">
    <div class="card-header"><div><div class="card-title">${icon('alert-triangle', { size: 18 })} Needs attention</div><div class="card-sub">${incomplete.length ? 'People who have not submitted every required document' : 'Nothing is waiting on you'}</div></div>
      ${incomplete.length ? button('View all', { variant: 'ghost', size: 'sm', href: href('people') }) : ''}</div>
    <div style="margin-top:12px">
      ${incomplete.length ? incomplete.slice(0, 6).map(attnRow).join('') : empty({ icon: 'circle-check', tone: 'green', title: 'All caught up', text: 'Every active person has submitted their required documents.' })}
      ${awaitingSigned.length ? `<div class="attn-item" style="background:var(--amber-50);cursor:default"><span class="chip-icon chip-icon--amber">${icon('signature', { size: 20 })}</span><div class="attn-main"><b>${awaitingSigned.length} offer ${awaitingSigned.length === 1 ? 'letter is' : 'letters are'} awaiting a signed copy</b><small class="truncate">${esc(awaitingSigned.slice(0, 3).map(c => c.holderName).join(', '))}${awaitingSigned.length > 3 ? '…' : ''}</small></div>${button('Review', { size: 'sm', href: href('documents') })}</div>` : ''}
    </div>
  </section>

  <div class="dash-side">
    <section class="card card-pad">
      <div class="card-title" style="margin-bottom:12px">${icon('zap', { size: 18 })} Quick actions</div>
      <div class="quick">
        <a class="quick-btn" href="${href('create')}"><span class="chip-icon chip-icon--violet">${icon('file-plus', { size: 20 })}</span><span>Issue a document<small>Certificate or letter</small></span></a>
        <button class="quick-btn" data-action="add-person"><span class="chip-icon chip-icon--teal">${icon('user-plus', { size: 20 })}</span><span>Add a person<small>Intern or employee</small></span></button>
        <button class="quick-btn" data-action="copy-onboard"><span class="chip-icon chip-icon--gold">${icon('link', { size: 20 })}</span><span>Copy onboarding link<small>Share with new joiners</small></span></button>
        <button class="quick-btn" data-action="copy-upload"><span class="chip-icon chip-icon--blue">${icon('cloud-upload', { size: 20 })}</span><span>Copy upload link<small>For documents</small></span></button>
      </div>
    </section>
  </div>

  <section class="card dash-chart">
    <div class="card-header"><div><div class="card-title">${icon('trending-up', { size: 18 })} Documents issued</div><div class="card-sub">Last 6 months</div></div></div>
    <div class="card-body"><div class="chart" role="img" aria-label="Documents issued per month">
      ${buckets.map(b => `<div class="bar-col"><div class="bar${b.now ? ' is-now' : ''}" style="height:${Math.max(3, Math.round(b.count / maxBar * 100))}%" title="${b.count} in ${esc(b.label)}">${b.count ? `<span class="bar-val">${b.count}</span>` : ''}</div><span class="bar-label">${esc(b.label)}</span></div>`).join('')}
    </div></div>
  </section>

  <section class="card dash-activity">
    <div class="card-header"><div class="card-title">${icon('history', { size: 18 })} Recent activity</div></div>
    <div class="timeline" style="margin-top:8px;padding-bottom:8px">
      ${activity.length ? activity.slice(0, 7).map(a => `<div class="tl-item"><span class="tl-dot chip-icon--${a.tone}">${icon(a.icon, { size: 16 })}</span><div class="tl-main">${a.text}<small>${esc(a.sub)} · ${esc(timeAgo(a.at))}</small></div></div>`).join('') : empty({ icon: 'history', title: 'No activity yet', text: 'Issued documents and uploads will appear here.' })}
    </div>
  </section>

  ${showBizCards ? `<section class="dash-biz"><div class="card-title" style="margin:6px 0 12px">${icon('building', { size: 18 })} Businesses</div>
    <div class="sg-grid" style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${data.businesses.filter(b => b.active).map(b => {
        const bp = data.employees.filter(e => e.status !== 'former' && (businessOf(e.businessId)?.id === b.id));
        const bc = data.certs.filter(c => businessOf(c.businessId)?.id === b.id);
        const done = bp.filter(e => { const p = progressOf(e); return p.done === p.total; }).length;
        return `<button class="card card--interactive biz-card" data-action="scope" data-id="${esc(b.id)}" style="text-align:inherit;font:inherit;color:inherit">
          <div class="row"><span class="scope-chip" style="width:38px;height:38px">${esc(b.code)}</span><div class="grow"><b style="font-size:15px">${esc(b.displayName)}</b><div class="muted" style="font-size:12.5px">${b.id === parentBusiness()?.id ? 'Parent company' : 'Venture'}</div></div>${icon('arrow-up-right', { size: 18 })}</div>
          <div class="biz-stats"><div><b>${bp.length}</b><small>people</small></div><div><b>${bc.length}</b><small>documents</small></div><div><b>${bp.length ? Math.round(done / bp.length * 100) : 100}%</b><small>complete</small></div></div></button>`;
      }).join('')}
    </div></section>` : ''}
</div>`;

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); ctx.toast(`${what} copied to the clipboard.`, { title: 'Link copied' }); }
    catch { ctx.toast('Copy failed — select the link and copy it manually.', { type: 'error' }); }
  };
  const origin = `${location.origin}${location.pathname}`;
  onAction(el, {
    'add-person': () => { ctx.go('people'); setTimeout(() => document.getElementById('btn-add-employee')?.click(), 450); },
    'copy-onboard': () => { const b = scopedBusiness() || parentBusiness(); copy(`${origin}#onboard${b ? '/' + b.code.toLowerCase() : ''}`, 'Onboarding link'); },
    'copy-upload': () => copy(`${origin}#upload`, 'Upload link'),
    'scope': (btn) => setScope(btn.dataset.id),
  });
}
