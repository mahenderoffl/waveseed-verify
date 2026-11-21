// ─── welcome.js — "Welcome to WaveSeed Co." (#welcome) ───────────────────────
// The last formality: shown once the offer is accepted (and, ideally, documents are in).
import { publicAcceptLookup } from '../api.js';
import { icon } from '../ui/icons.js';
import { esc, fmtDate, fmtIST, daysUntil, offerData, signedCopyHtml, offerHtml, openDoc, getJourney, clearJourney, stepperHTML, logoOf } from '../utils/journey.js';

const SPARKS = [[8, 18, 0], [18, 62, 1.1], [30, 28, 2.2], [44, 70, 0.6], [58, 22, 1.7], [70, 58, 2.9], [82, 30, 0.3], [92, 66, 1.4], [14, 84, 3.2], [76, 86, 2.4]];

export function initWelcomePage(app) {
  const J = getJourney();
  if (!J) { location.hash = '#accept'; return; }
  app.innerHTML = '<div class="app-splash" role="status"><div class="spinner"></div></div>';

  publicAcceptLookup({ ref: J.ref, dob: J.dob }).then((r) => {
    if (!r.acceptance || r.acceptance.state !== 'accepted') { location.hash = `#accept?ref=${encodeURIComponent(J.ref)}`; return; }
    render(r);
  }).catch(() => { location.hash = `#accept?ref=${encodeURIComponent(J.ref)}`; });

  function render(r) {
    const d = offerData(r), iss = r.issuer || {}, v = iss.venture;
    const company = iss.name || 'WaveSeed Co.';
    const first = (r.holderName || '').split(/\s+/)[0] || 'there';
    const start = r.startDate || d.startDate || d.joiningDate || '';
    const n = daysUntil(start);
    const docsDone = !!J.docsDone;
    const a = r.acceptance;
    const rec = { ...a, holderName: r.holderName, consentClause: r.consent.clause, consentTexts: r.consent.items.map((i) => i.text) };
    const where = [d.workMode || r.workMode, d.workLocation].filter(Boolean).join(' · ');
    const mail = iss.email || 'support@waveseed.co';

    const countdown = n == null ? '' : n > 1
      ? `<div class="jyw-count"><b>${n}</b><span>days until you start</span></div>`
      : n === 1 ? '<div class="jyw-count"><b>Tomorrow</b><span>is your first day</span></div>'
      : n === 0 ? '<div class="jyw-count"><b>Today</b><span>is your first day. Welcome aboard</span></div>'
      : '<div class="jyw-count"><b>Welcome aboard</b><span>we’re glad you’re here</span></div>';

    const joinRows = [
      ['Role', r.role + (r.product ? ` · ${r.product}` : '')],
      ['Starts', fmtDate(start)],
      ['Duration', d.duration || ''],
      ['Work mode', where],
      ['Reporting to', d.reportingTo || r.reportingTo || ''],
    ].filter((x) => x[1]);

    app.innerHTML = `<div class="ws-app jy">
      <section class="jyw-hero">
        ${SPARKS.map(([x, y, t]) => `<span class="jyw-spark" style="left:${x}%;top:${y}%;animation-delay:${t}s"></span>`).join('')}
        <div class="jyw-logo"><img src="${esc(logoOf(iss))}" alt="${esc(company)} logo"/></div>
        <h1>Welcome to <em>${esc(company)}</em></h1>
        <p class="jyw-sub">${esc(first)}, we’re delighted that you’re joining us as <b>${esc(r.role)}</b>. Your formalities are done. Everything you need next is right here.</p>
        ${v ? `<div class="jyw-venture">${esc(v.name)} <span>· A venture of ${esc(iss.legal || company)}</span></div>` : ''}
        <div class="jyw-rule"></div>
        <div style="position:relative;z-index:1;max-width:640px;margin:26px auto 0">${stepperHTML(6)}</div>
      </section>

      <main class="jyw-main">
        <div class="jyw-grid">
          <section class="jyw-card">
            <h2>${icon('badge-check', { size: 20 })} You’re all set</h2>
            <ul class="jyw-list">
              <li><span class="jyw-dot">${icon('check', { size: 15, stroke: 3 })}</span><div><b>Offer accepted</b><small>${esc(fmtIST(a.acceptedAt))}${a.method === 'electronic' ? ' · signed electronically' : ' · signed copy received'}</small></div></li>
              <li><span class="jyw-dot${docsDone ? '' : ' wait'}">${icon(docsDone ? 'check' : 'clock', { size: 15, stroke: docsDone ? 3 : 2 })}</span>
                <div><b>${docsDone ? 'Documents submitted' : 'Documents pending'}</b>
                <small>${docsDone ? 'Our HR team will verify them securely.' : 'You can upload them any time. <a href="#upload">Upload now</a>'}</small></div></li>
              <li><span class="jyw-dot idle">${icon('shield-check', { size: 15 })}</span><div><b>HR verification</b><small>${docsDone ? 'In progress. We’ll be in touch if anything is unclear.' : 'Starts once your documents are in.'}</small></div></li>
            </ul>
            <div class="jy-actions" style="margin-top:18px">
              ${a.method === 'electronic'
                ? `<button class="jy-btn sm" id="w-signed">${icon('download', { size: 16 })} Signed offer copy</button>`
                : `<button class="jy-btn sm" id="w-signed">${icon('file-text', { size: 16 })} View my offer</button>`}
              <a class="jy-btn ghost sm" href="mailto:${esc(mail)}">${icon('mail', { size: 16 })} Contact HR</a>
            </div>
          </section>

          <section class="jyw-card">
            <h2>${icon('calendar-days', { size: 20 })} Your joining details</h2>
            <div class="jyw-join">${joinRows.map(([k, val]) => `<div><span>${k}</span><b>${esc(val)}</b></div>`).join('')}</div>
            ${countdown}
          </section>
        </div>

        <section class="jyw-card" style="margin-top:16px">
          <h2>${icon('rocket', { size: 20 })} What happens next</h2>
          <ol class="jyw-steps">
            <li><span class="n">1</span><div><b>HR verifies your documents</b><small>Every file is checked privately by our HR team. If anything is unclear we’ll write to you${r.holderEmail ? ` at ${esc(r.holderEmail)}` : ''}.</small></div></li>
            <li><span class="n">2</span><div><b>Your first-week plan</b><small>${esc(d.reportingTo || r.reportingTo || 'Your reporting manager')} will connect with you before you start to share how your first week will run.</small></div></li>
            <li><span class="n">3</span><div><b>Day one${start ? `, ${esc(fmtDate(start))}` : ''}</b><small>Keep your original documents handy for verification where needed, and bring your curiosity.</small></div></li>
            <li><span class="n">4</span><div><b>Everything on record</b><small>Your certificates and letters are issued by us and can be verified by anyone, any time, at <a href="https://verify.waveseed.app">verify.waveseed.app</a>.</small></div></li>
          </ol>
        </section>

        <div class="jyw-note">${icon('info', { size: 16 })} <b>Questions?</b> Write to <a href="mailto:${esc(mail)}">${esc(mail)}</a> and quote your reference <b>${esc(r.referenceNumber)}</b>. We’re happy to help.</div>

        <div class="jyw-quote">${esc(iss.tagline || 'Seeding the next wave.')}<small>Welcome to the team · ${esc(company)}</small></div>
        <p class="jy-foot" style="padding-top:22px"><button class="jy-link" id="w-out" style="text-decoration:underline">Not you? Sign out of this page</button></p>
      </main>
    </div>`;
    window.scrollTo({ top: 0 });

    app.querySelector('#w-signed').addEventListener('click', () => {
      const html = a.method === 'electronic' ? signedCopyHtml(r, rec) : offerHtml(r);
      if (!openDoc(html)) alert('Please allow pop-ups to open your document.');
    });
    app.querySelector('#w-out').addEventListener('click', () => { clearJourney(); location.hash = ''; });
  }
}
