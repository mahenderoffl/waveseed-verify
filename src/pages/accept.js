// ─── accept.js — Offer acceptance (#accept?ref=…) ────────────────────────────
// 1 Verify (reference + date of birth)  2 Review the offer  3 Accept: electronic signature,
// signed-copy upload, or decline  → then the document upload page (#upload) and the welcome page.
import { publicAcceptLookup, publicAcceptSubmit, publicUploadSigned } from '../api.js';
import { icon } from '../ui/icons.js';
import {
  esc, fmtDate, fmtIST, daysUntil, offerData, offerHtml, signedCopyHtml, previewDoc, openDoc, getGeo, shrinkImage,
  getJourney, setJourney, patchJourney, mountShell, spinner, alertBox,
} from '../utils/journey.js';

const normName = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function initAcceptPage(app) {
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const S = { ref: (q.get('ref') || '').trim(), dob: '', r: null, ui: null, rec: null };
  let shell = mountShell(app, null);
  let main = shell.main;

  const rebrand = () => {   // re-draw the brand bar once we know which business the offer is from
    shell = mountShell(app, S.r && S.r.issuer);
    main = shell.main;
  };
  const on = (map) => main.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && map[el.dataset.act]) { e.preventDefault(); map[el.dataset.act](el); }
  });

  // ── 1. Verify ───────────────────────────────────────────────────────────────
  function viewIdentify(err = '', remaining) {
    shell.setHero({ eyebrow: 'Offer acceptance', title: 'Accept your offer', sub: 'Sign in with your reference number and date of birth to read your offer and respond to it securely.', step: 1 });
    main.innerHTML = `<div class="jy-card">
      <h2>Verify it’s you</h2>
      <p class="lead">Your reference number is on your offer letter. We ask for your date of birth so that only you can open it.</p>
      <form id="f-id" novalidate>
        <div class="jy-field"><label class="jy-label" for="a-ref">Reference number</label>
          <input class="jy-input" id="a-ref" autocomplete="off" spellcheck="false" placeholder="e.g. WS/INT/2026/001" value="${esc(S.ref)}"/></div>
        <div class="jy-field"><label class="jy-label" for="a-dob">Date of birth</label>
          <input class="jy-input" id="a-dob" type="date" value="${esc(S.dob)}"/></div>
        <div id="a-err">${err ? alertBox('err', esc(err) + (remaining ? '' : '')) : ''}</div>
        <div class="jy-actions"><button class="jy-btn navy block" id="a-go" type="submit">Open my offer ${icon('arrow-right', { size: 18 })}</button></div>
      </form>
      <p class="jy-notice">${icon('lock', { size: 13 })} We never show your offer to anyone who cannot give both details. Too many wrong attempts will lock this page for a short while.</p>
    </div>`;
    const f = main.querySelector('#f-id');
    (S.ref ? main.querySelector('#a-dob') : main.querySelector('#a-ref')).focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      S.ref = main.querySelector('#a-ref').value.trim();
      S.dob = main.querySelector('#a-dob').value;
      if (!S.ref || !S.dob) return viewIdentify('Please enter both your reference number and your date of birth.');
      const btn = main.querySelector('#a-go');
      btn.disabled = true; btn.innerHTML = `${spinner} Checking…`;
      await load();
    });
  }

  async function load() {
    try {
      S.r = await publicAcceptLookup({ ref: S.ref, dob: S.dob });
      setJourney({ ref: S.ref, dob: S.dob, type: S.r.employeeType, name: S.r.holderName });
      rebrand();
      const a = S.r.acceptance;
      if (a.state === 'accepted') return viewAccepted();
      viewReview();
    } catch (e) {
      viewIdentify(e.message, e.remaining);
    }
  }

  // ── 2. Review ───────────────────────────────────────────────────────────────
  function facts(r, d) {
    const rows = [
      ['briefcase', 'Role', r.role + (r.product ? ` · ${r.product}` : ''), ''],
      ['calendar', 'Starts', fmtDate(r.startDate || d.startDate || d.joiningDate), 'gold'],
      ['clock', 'Duration', d.duration || (r.startDate && r.endDate ? `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}` : ''), ''],
      ['map-pin', 'Work mode', [d.workMode || r.workMode, d.workLocation].filter(Boolean).join(' · '), 'teal'],
      ['rupee', r.certificateType === 'employment-offer' ? 'Compensation (CTC)' : 'Stipend', d.ctc || d.stipend || '', 'violet'],
      ['user', 'Reporting to', d.reportingTo || r.reportingTo || '', ''],
    ].filter((x) => x[2]);
    return `<div class="jy-facts">${rows.map(([ic, k, v, tone]) => `<div class="jy-fact ${tone}"><div class="chip">${icon(ic, { size: 18 })}</div><div><small>${k}</small><b>${esc(v)}</b></div></div>`).join('')}</div>`;
  }

  function validityPill(r) {
    if (!r.validUntil) return '';
    if (r.expired) return `<span class="jy-pill bad">${icon('clock', { size: 14 })} Offer expired on ${esc(fmtDate(r.validUntil))}</span>`;
    const n = daysUntil(r.validUntil);
    const left = n === 0 ? 'today' : n === 1 ? 'tomorrow' : n != null && n > 1 && n <= 14 ? `in ${n} days` : '';
    return `<span class="jy-pill${n != null && n > 3 ? ' ok' : ''}">${icon('hourglass', { size: 14 })} Valid until ${esc(fmtDate(r.validUntil))}${left ? ` · ${left}` : ''}</span>`;
  }

  function viewReview() {
    const r = S.r, d = offerData(r);
    const first = (r.holderName || '').split(/\s+/)[0] || 'there';
    const venture = r.issuer && r.issuer.venture;
    shell.setHero({
      eyebrow: venture ? venture.name : 'Your offer',
      title: `Hi ${esc(first)}, your offer is ready`,
      sub: `${esc((r.issuer && (r.issuer.legal || r.issuer.name)) || 'WaveSeed Co.')} would like you to join as <b>${esc(r.role)}</b>. Read it through, then let us know.`,
      step: 2,
    });
    const html = offerHtml(r);
    const declined = r.acceptance.state === 'declined';
    main.innerHTML = `<div class="jy-card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
        <h2>Your offer at a glance</h2>${validityPill(r)}
      </div>
      ${facts(r, d)}
      <div class="jy-sec"><div class="jy-sec-t">${icon('file-text', { size: 14 })} The full letter</div>
        <div class="jy-preview">
          <div class="jy-preview-bar"><span>${esc(r.certificateId)}</span>
            <button class="jy-btn ghost sm" data-act="open-letter">${icon('external-link', { size: 15 })} Open · print · save PDF</button></div>
          <iframe title="Your offer letter" sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="${esc(previewDoc(html))}"></iframe>
        </div>
        <p class="jy-hint">Please read the whole letter, including the terms and conditions on the later pages.</p>
      </div>
      ${declined ? alertBox('warn', `You declined this offer on ${esc(fmtIST(r.acceptance.acceptedAt))}.${r.expired ? '' : ' You can still change your mind below.'}`, 'info') : ''}
    </div>
    <div class="jy-card">
      <h2>${r.expired ? 'This offer has expired' : 'How would you like to respond?'}</h2>
      ${r.expired
        ? alertBox('warn', `The last date to accept was ${esc(fmtDate(r.validUntil))}. If you still wish to join, please write to <a href="mailto:${esc(r.issuer && r.issuer.email)}">${esc((r.issuer && r.issuer.email) || 'the company')}</a>.`, 'clock')
        : `<div class="jy-choices">
        <button class="jy-choice primary" data-act="to-sign"><span class="jy-tag">Recommended · 2 minutes</span>
          <span class="chip">${icon('signature', { size: 22 })}</span>
          <span><b>Accept with my electronic signature</b><span class="d">Sign on this page. You’ll get a signed copy straight away.</span></span><span class="go">${icon('chevron-right', { size: 20 })}</span></button>
        <button class="jy-choice" data-act="to-upload"><span class="chip">${icon('upload', { size: 22 })}</span>
          <span><b>I have signed a printed copy</b><span class="d">Upload a scan or photo of the signed acknowledgement page.</span></span><span class="go">${icon('chevron-right', { size: 20 })}</span></button>
        <button class="jy-choice" data-act="to-decline"><span class="chip" style="background:var(--rose-50);color:var(--rose-700)">${icon('x', { size: 22 })}</span>
          <span><b>Decline this offer</b><span class="d">Let the company know you won’t be joining.</span></span><span class="go">${icon('chevron-right', { size: 20 })}</span></button>
      </div>`}
    </div>`;
    main.onclick = null;
    bind({
      'open-letter': () => { if (!openDoc(html)) toastIn('Your browser blocked the pop-up. Please allow pop-ups for this site and try again.'); },
      'to-sign': viewSign, 'to-upload': viewUpload, 'to-decline': viewDecline,
    });
  }

  // a fresh listener per view: replace the node so old handlers are gone
  function bind(map) {
    const fresh = main.cloneNode(true);
    main.replaceWith(fresh);
    main = fresh; shell.main = fresh;
    on(map);
    return main;
  }
  function toastIn(msg) {
    let el = main.querySelector('.jy-toast');
    if (!el) { el = document.createElement('div'); el.className = 'jy-card jy-toast'; main.prepend(el); }
    el.innerHTML = alertBox('warn', esc(msg));
  }

  // ── 3a. Electronic signature ────────────────────────────────────────────────
  function viewSign() {
    const r = S.r, c = r.consent;
    shell.setHero({ eyebrow: 'Electronic acceptance', title: 'Sign your offer', sub: 'Read the declarations, type your full name and sign. It takes about a minute.', step: 3 });
    main.innerHTML = `<div class="jy-card">
      <h2>${icon('signature', { size: 20 })} Sign &amp; accept</h2>
      <div class="jy-sec">
        <div class="jy-clause"><b>${esc(c.clauseTitle)}</b>${esc(c.clause)}</div>
      </div>
      <div class="jy-sec"><div class="jy-sec-t">Your declarations</div>
        <div class="jy-checks">${c.items.map((it) => `<label class="jy-check"><input type="checkbox" data-consent="${esc(it.id)}"/><span class="box">${icon('check', { size: 14, stroke: 3 })}</span><span>${esc(it.text)}</span></label>`).join('')}</div>
      </div>
      <div class="jy-sec"><div class="jy-sec-t">Your signature</div>
        <label class="jy-label" for="s-name">Type your full name exactly as it appears on the letter: <b>${esc(r.holderName)}</b></label>
        <input class="jy-input" id="s-name" autocomplete="off" spellcheck="false" placeholder="${esc(r.holderName)}"/>
        <div class="jy-sign-box" aria-live="polite"><div class="jy-sign-name empty" id="s-preview">Your signature appears here</div>
          <div class="jy-sign-line"><span>Electronic signature</span><span id="s-stamp">${esc(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div></div>
      </div>
      <div class="jy-sec"><div class="jy-sec-t">Optional</div>
        <label class="jy-check"><input type="checkbox" id="s-geo"/><span class="box">${icon('check', { size: 14, stroke: 3 })}</span>
          <span><b>Share my approximate location</b><br/><span style="color:var(--ink-3)">Adds your location to the acceptance record. Your browser will ask for permission. It is entirely optional and you can accept without it.</span></span></label>
      </div>
      <details class="jy-notice"><summary>What we record, and why</summary><p style="margin-top:6px">${esc(c.privacy)}</p></details>
      <div id="s-err"></div>
      <div class="jy-actions">
        <button class="jy-btn block" id="s-go" data-act="sign">${icon('stamp', { size: 18 })} Sign and accept this offer</button>
        <button class="jy-btn ghost" data-act="back">Back</button>
      </div>
      <p class="jy-notice">${icon('lock', { size: 13 })} The time of acceptance is taken from our secure server, not your device.</p>
    </div>`;
    const nameEl = main.querySelector('#s-name'), prev = main.querySelector('#s-preview');
    nameEl.addEventListener('input', () => {
      const v = nameEl.value.trim();
      prev.textContent = v || 'Your signature appears here';
      prev.classList.toggle('empty', !v);
    });
    bind({ back: viewReview, sign: doSign });
    // re-attach input listener lost by cloning
    const n2 = main.querySelector('#s-name'), p2 = main.querySelector('#s-preview');
    n2.addEventListener('input', () => { const v = n2.value.trim(); p2.textContent = v || 'Your signature appears here'; p2.classList.toggle('empty', !v); });
  }

  async function doSign() {
    const r = S.r, c = r.consent;
    const err = (m) => { main.querySelector('#s-err').innerHTML = alertBox('err', esc(m)); };
    const ids = [...main.querySelectorAll('[data-consent]')].filter((x) => x.checked).map((x) => x.dataset.consent);
    if (ids.length !== c.items.length) return err('Please tick every declaration before signing.');
    const typed = main.querySelector('#s-name').value.trim();
    if (!typed) return err('Please type your full name to sign.');
    if (normName(typed) !== normName(r.holderName)) return err(`Please type your name exactly as it appears on the offer: ${r.holderName}`);
    const btn = main.querySelector('#s-go');
    btn.disabled = true; btn.innerHTML = `${spinner} Signing…`;
    try {
      const geo = main.querySelector('#s-geo').checked ? await getGeo() : { status: 'not_requested' };
      const res = await publicAcceptSubmit({
        ref: S.ref, dob: S.dob, decision: 'accept', method: 'electronic', signedName: typed, consents: ids, geo,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language,
      });
      S.rec = {
        state: 'accepted', method: 'electronic', receiptId: res.receiptId, acceptedAt: res.acceptedAt, signedName: res.signedName || typed,
        holderName: r.holderName, ip: res.ip, geoStatus: geo.status, geoLat: geo.lat, geoLon: geo.lon, geoAccuracyM: geo.accuracy, docHash: res.docHash,
        userAgent: navigator.userAgent, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        consentVersion: c.version, consentClause: c.clause, consentTexts: c.items.map((i) => i.text),
      };
      viewDone();
    } catch (e) {
      btn.disabled = false; btn.innerHTML = `${icon('stamp', { size: 18 })} Sign and accept this offer`;
      if (e.status === 409) { await load(); return; }
      err(e.message);
    }
  }

  // ── 3b. Signed copy upload ──────────────────────────────────────────────────
  function viewUpload() {
    const r = S.r, html = offerHtml(r);
    shell.setHero({ eyebrow: 'Signed copy', title: 'Upload your signed copy', sub: 'Print the letter, sign the acknowledgement on the last page, then upload a scan or a clear photo.', step: 3 });
    main.innerHTML = `<div class="jy-card">
      <h2>${icon('upload', { size: 20 })} Three quick steps</h2>
      <ol class="jy-list" style="margin:14px 0 0;padding-left:20px;display:grid;gap:10px;color:var(--ink-2)">
        <li><b style="color:var(--ink)">Print the letter.</b> <button class="jy-link" style="color:var(--navy-600)" data-act="open-letter">Open it here</button> and choose Print or Save as PDF.</li>
        <li><b style="color:var(--ink)">Sign the acknowledgement</b> on the last page, with the date and place.</li>
        <li><b style="color:var(--ink)">Upload it</b> as a PDF or photo (up to 4 MB). A phone photo is fine if every line is readable.</li>
      </ol>
      ${r.signedUrl ? alertBox('ok', 'A signed copy is already on file. Upload another to replace it, or confirm your acceptance with the one you sent.', 'circle-check') : ''}
      <input type="file" id="u-file" accept="application/pdf,image/*" hidden/>
      <div id="u-err"></div>
      <div id="u-bar" class="jy-slot-bar" style="display:none"><i></i></div>
      <div class="jy-actions">
        <button class="jy-btn block" id="u-pick" data-act="pick">${icon('upload', { size: 18 })} Choose signed copy</button>
        ${r.signedUrl ? `<button class="jy-btn navy" data-act="confirm-existing">Use the copy on file</button>` : ''}
        <button class="jy-btn ghost" data-act="back">Back</button>
      </div>
      <p class="jy-notice">${icon('lock', { size: 13 })} Your acceptance is recorded with the date, time and your IP address once the file is received.</p>
    </div>`;
    bind({
      back: viewReview,
      'open-letter': () => { if (!openDoc(html)) toastIn('Your browser blocked the pop-up. Please allow pop-ups for this site.'); },
      pick: () => main.querySelector('#u-file').click(),
      'confirm-existing': () => finishSigned(),
    });
    main.querySelector('#u-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const err = (m) => { main.querySelector('#u-err').innerHTML = alertBox('err', esc(m)); };
      main.querySelector('#u-err').innerHTML = '';
      if (!/^(application\/pdf|image\/)/.test(f.type)) return err('Please choose a PDF or an image.');
      const bar = main.querySelector('#u-bar'), fill = bar.firstElementChild, pick = main.querySelector('#u-pick');
      bar.style.display = 'block'; fill.style.width = '25%'; pick.disabled = true; pick.innerHTML = `${spinner} Uploading…`;
      try {
        const file = await shrinkImage(f);
        if (file.size > 4 * 1024 * 1024) throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. Please keep it under 4 MB.`);
        fill.style.width = '60%';
        await publicUploadSigned({ ref: S.ref, dob: S.dob, file });
        fill.style.width = '85%';
        await finishSigned();
      } catch (ex) {
        err(ex.message); bar.style.display = 'none'; pick.disabled = false; pick.innerHTML = `${icon('upload', { size: 18 })} Choose signed copy`;
      }
    });
  }

  async function finishSigned() {
    try {
      const res = await publicAcceptSubmit({ ref: S.ref, dob: S.dob, decision: 'accept', method: 'signed_copy', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language, geo: { status: 'not_requested' } });
      S.rec = { state: 'accepted', method: 'signed_copy', receiptId: res.receiptId, acceptedAt: res.acceptedAt, holderName: S.r.holderName, signedName: S.r.holderName, ip: '', geoStatus: 'not_requested', userAgent: navigator.userAgent, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      viewDone();
    } catch (e) {
      if (e.status === 409) return load();
      const box = main.querySelector('#u-err');
      if (box) box.innerHTML = alertBox('err', esc(e.message));
    }
  }

  // ── 3c. Decline ─────────────────────────────────────────────────────────────
  function viewDecline() {
    shell.setHero({ eyebrow: 'Your response', title: 'Decline this offer', sub: 'We’re sorry it isn’t the right fit. Letting us know helps us plan.', step: 3 });
    main.innerHTML = `<div class="jy-card">
      <h2>Before you go</h2>
      <p class="lead">This tells the company you will not be joining. Tell us why if you’d like to (optional).</p>
      <div class="jy-field"><label class="jy-label" for="d-why">Reason (optional)</label><textarea class="jy-input" id="d-why" maxlength="500" placeholder="For example: I have accepted another opportunity"></textarea></div>
      <div id="d-err"></div>
      <div class="jy-actions">
        <button class="jy-btn navy" id="d-go" data-act="decline">Decline offer</button>
        <button class="jy-btn ghost" data-act="back">Go back</button>
      </div>
    </div>`;
    bind({ back: viewReview, decline: async () => {
      const btn = main.querySelector('#d-go'); btn.disabled = true; btn.innerHTML = `${spinner} Saving…`;
      try {
        const res = await publicAcceptSubmit({ ref: S.ref, dob: S.dob, decision: 'decline', reason: main.querySelector('#d-why').value, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language, geo: { status: 'not_requested' } });
        S.r.acceptance = { state: 'declined', acceptedAt: res.acceptedAt, receiptId: res.receiptId };
        viewDeclined();
      } catch (e) { btn.disabled = false; btn.textContent = 'Decline offer'; main.querySelector('#d-err').innerHTML = alertBox('err', esc(e.message)); }
    } });
  }

  function viewDeclined() {
    shell.setHero({ eyebrow: 'Response recorded', title: 'Thank you for letting us know', sub: 'Your response has been recorded and the company has been informed.', step: 3 });
    main.innerHTML = `<div class="jy-card"><div class="jy-done">
      <p class="lead">We wish you every success ahead.${S.r.expired ? '' : ' If you change your mind before the offer expires, you can reopen it from your offer letter.'}</p>
      <div class="jy-actions" style="justify-content:center">${S.r.expired ? '' : '<button class="jy-btn ghost" data-act="again">Review the offer again</button>'}</div></div></div>`;
    bind({ again: viewReview });
  }

  // ── Done: receipt ───────────────────────────────────────────────────────────
  function receipt(rec) {
    const geo = rec.geoStatus === 'granted' ? 'Shared' : rec.geoStatus === 'denied' ? 'Not shared' : rec.geoStatus === 'unavailable' ? 'Unavailable' : 'Not requested';
    const rows = [
      ['Receipt', `<b class="mono">${esc(rec.receiptId)}</b>`],
      ['Accepted by', `<b>${esc(rec.signedName || rec.holderName)}</b>`],
      ['Date and time', `<b>${esc(fmtIST(rec.acceptedAt))}</b>`],
      rec.ip ? ['IP address', `<b class="mono">${esc(rec.ip)}</b>`] : null,
      rec.method === 'electronic' ? ['Location', `<b>${geo}</b>`] : null,
      rec.docHash ? ['Offer fingerprint', `<b class="mono">${esc(rec.docHash.slice(0, 16))}…</b>`] : null,
    ].filter(Boolean);
    return `<div class="jy-receipt">${rows.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join('')}</div>`;
  }

  function tick() { return `<svg class="jy-tick" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="40"/><path d="M25 43 l12 12 l23 -26"/></svg>`; }

  function viewDone() {
    const r = S.r, rec = S.rec;
    r.acceptance = { ...rec };
    patchJourney({ accepted: true });
    const first = (r.holderName || '').split(/\s+/)[0];
    shell.setHero({ eyebrow: 'Offer accepted', title: `Thank you, ${esc(first)}`, sub: 'Your acceptance has been recorded. One last step: upload your documents to complete your joining formalities.', step: 4 });
    main.innerHTML = `<div class="jy-card"><div class="jy-done">${tick()}
      <h2>${rec.method === 'electronic' ? 'You’ve signed and accepted your offer' : 'Your signed copy has been received'}</h2>
      <p class="lead">Keep this receipt for your records.</p></div>
      ${receipt(rec)}
      <div class="jy-actions" style="justify-content:center">
        <button class="jy-btn" data-act="docs">Continue to document upload ${icon('arrow-right', { size: 18 })}</button>
        ${rec.method === 'electronic' ? `<button class="jy-btn ghost" data-act="signed">${icon('download', { size: 18 })} Signed copy</button>` : ''}
      </div></div>`;
    bind({ docs: () => { location.hash = '#upload'; }, signed: () => { if (!openDoc(signedCopyHtml(r, rec))) toastIn('Please allow pop-ups to open your signed copy.'); } });
  }

  // Already accepted earlier (returning visitor)
  function viewAccepted() {
    const r = S.r, a = r.acceptance;
    const rec = { ...a, holderName: r.holderName, consentClause: r.consent.clause, consentTexts: r.consent.items.map((i) => i.text) };
    S.rec = rec;
    const first = (r.holderName || '').split(/\s+/)[0];
    shell.setHero({ eyebrow: 'Offer accepted', title: `Welcome back, ${esc(first)}`, sub: 'You have already accepted this offer. Here is your receipt and the next step.', step: 4 });
    main.innerHTML = `<div class="jy-card"><div class="jy-done">${tick()}<h2>Your offer is accepted</h2></div>${receipt(rec)}
      <div class="jy-actions" style="justify-content:center">
        <button class="jy-btn" data-act="docs">Continue to document upload ${icon('arrow-right', { size: 18 })}</button>
        <button class="jy-btn ghost" data-act="signed">${icon('download', { size: 18 })} ${a.method === 'electronic' ? 'Signed copy' : 'View offer'}</button>
      </div></div>`;
    bind({ docs: () => { location.hash = '#upload'; },
      signed: () => { const h = a.method === 'electronic' ? signedCopyHtml(r, rec) : offerHtml(r); if (!openDoc(h)) toastIn('Please allow pop-ups to open the document.'); } });
  }

  // Resume: same tab, same offer, still signed in
  const j = getJourney();
  if (j && S.ref && j.ref === S.ref) { S.dob = j.dob; load(); }
  else viewIdentify();
}
