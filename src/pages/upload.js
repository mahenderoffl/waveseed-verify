// ─── upload.js — Document upload (#upload) ───────────────────────────────────
// Reached straight after accepting an offer (already signed in), or on its own with
// reference number + date of birth. Files are compressed in the browser, then stored
// privately; HR verifies them later.
import { publicDocGetUploadUrl, publicDocUploadBlob, publicDocConfirm, publicAcceptLookup } from '../api.js';
import { compressFile, fmtKB } from '../utils/compress.js';
import { slotsFor, GROUPS, requirementProgress } from '../utils/docCatalog.js';
import { icon } from '../ui/icons.js';
import { esc, getJourney, setJourney, patchJourney, mountShell, spinner, alertBox } from '../utils/journey.js';
import { demoLookup } from '../utils/demo.js';

const GROUP_ICON = { identity: 'id-card', education: 'graduation-cap', work: 'briefcase' };
const GROUP_TITLE = { identity: 'Identity & bank', education: 'Education certificates', work: 'Work history' };

export function initUploadPage(app) {
  let issuer = null;
  const DEMO = !!(getJourney() || {}).demo;
  let shell = mountShell(app, null, { demo: DEMO });
  let main = shell.main;
  const done = new Set();

  const rebrand = () => { shell = mountShell(app, issuer, { demo: DEMO }); main = shell.main; };

  // ── Sign in (only when we are not coming from the acceptance page) ───────────
  function viewAuth(err = '') {
    shell.setHero({ eyebrow: 'Document upload', title: 'Upload your documents', sub: 'Sign in with your reference number and date of birth. Your files are encrypted in transit and visible only to authorised HR staff.', step: 4 });
    main.innerHTML = `<div class="jy-card"><h2>Verify it’s you</h2>
      <p class="lead">Use the reference number on your offer letter.</p>
      <form id="u-f" novalidate>
        <div class="jy-field"><label class="jy-label" for="u-ref">Reference number</label><input class="jy-input" id="u-ref" autocomplete="off" spellcheck="false" placeholder="e.g. WS/INT/2026/001"/></div>
        <div class="jy-grid2">
          <div class="jy-field"><label class="jy-label" for="u-dob">Date of birth</label><input class="jy-input" id="u-dob" type="date"/></div>
          <div class="jy-field"><label class="jy-label" for="u-type">I am joining as</label>
            <select class="jy-input" id="u-type"><option value="intern">An intern</option><option value="employee">An employee</option></select></div>
        </div>
        <div id="u-err">${err ? alertBox('err', esc(err)) : ''}</div>
        <div class="jy-actions"><button class="jy-btn navy block" id="u-go" type="submit">Continue ${icon('arrow-right', { size: 18 })}</button></div>
      </form></div>`;
    main.querySelector('#u-f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ref = main.querySelector('#u-ref').value.trim(), dob = main.querySelector('#u-dob').value, type = main.querySelector('#u-type').value;
      if (!ref || !dob) return viewAuth('Please enter your reference number and date of birth.');
      const btn = main.querySelector('#u-go'); btn.disabled = true; btn.innerHTML = `${spinner} Checking…`;
      try {
        // A tiny authorised request: it only succeeds for a valid reference + date of birth
        await publicDocGetUploadUrl({ ref, dob, docType: 'photo', fileName: 'check.jpg', mimeType: 'image/jpeg', sizeBytes: 1024 });
        setJourney({ ref, dob, type });
        viewDocs({ ref, dob, type });
      } catch (ex) { viewAuth(ex.message); }
    });
  }

  // ── Slots ──────────────────────────────────────────────────────────────────
  function viewDocs(J) {
    const slots = slotsFor(J.type);
    const first = (J.name || '').split(/\s+/)[0];
    shell.setHero({
      eyebrow: 'Last step',
      title: first ? `Almost there, ${esc(first)}` : 'Upload your documents',
      sub: 'Add the documents below. Photos from your phone are fine. We shrink them automatically before upload.',
      step: 4,
    });
    const slotHTML = (s) => `<div class="jy-slot" id="slot-${s.type}">
      <div class="chip">${icon(GROUP_ICON[s.group] || 'file-text', { size: 20 })}</div>
      <div class="t"><b>${esc(s.label)}${s.required ? '<span class="jy-req">Required</span>' : s.oneOf ? '<span class="jy-req one">One needed</span>' : '<span class="jy-req opt">Optional</span>'}</b>
        <small>${esc(s.hint)}</small><div class="st" id="st-${s.type}"></div>
        <div class="jy-slot-bar" id="bar-${s.type}"><i></i></div></div>
      <label class="jy-btn ghost sm" id="btn-${s.type}" style="cursor:pointer">${icon('upload', { size: 15 })} <span>Choose file</span>
        <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" data-slot="${s.type}"/></label>
    </div>`;
    const need = requirementProgress(slots, () => false).total;
    main.innerHTML = `<div class="jy-card">
      <div class="jy-prog"><div class="jy-prog-bar"><i id="p-fill"></i></div><b id="p-txt">0 of ${need} required</b></div>
      <p class="jy-hint" style="margin-top:10px">JPG, PNG, WebP or PDF · each file is shrunk to under 1.5 MB · only you and authorised HR staff can see them.</p>
      ${GROUPS.map((g) => {
        const items = slots.filter((s) => s.group === g.id);
        return items.length ? `<div class="jy-sec"><div class="jy-sec-t">${icon(GROUP_ICON[g.id] || 'file-text', { size: 14 })} ${GROUP_TITLE[g.id] || esc(g.title)}</div>${items.map(slotHTML).join('')}</div>` : '';
      }).join('')}
      <div class="jy-sticky"><span id="p-need" style="font-size:13px;color:var(--ink-2)"></span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="jy-link" id="p-later">I’ll finish later</button>
          <button class="jy-btn" id="p-go" disabled>Finish &amp; continue ${icon('arrow-right', { size: 18 })}</button></div></div>
    </div>`;

    const isDone = (t) => done.has(t);
    const refresh = () => {
      const p = requirementProgress(slots, isDone);
      main.querySelector('#p-fill').style.width = (p.total ? Math.round((p.done / p.total) * 100) : 100) + '%';
      main.querySelector('#p-txt').textContent = `${p.done} of ${p.total} required`;
      main.querySelector('#p-need').textContent = p.done === p.total ? 'All required documents are in. You’re ready to finish.' : `Still needed: ${p.missing.join(' · ')}`;
      main.querySelector('#p-go').disabled = p.done !== p.total;
      return p;
    };
    refresh();

    const finish = (complete) => { patchJourney({ docsDone: complete }); location.hash = '#welcome'; };
    main.querySelector('#p-go').addEventListener('click', () => finish(true));
    main.querySelector('#p-later').addEventListener('click', () => finish(refresh().done === refresh().total));

    main.addEventListener('change', async (e) => {
      const input = e.target.closest('input[data-slot]');
      if (!input || !input.files[0]) return;
      const docType = input.dataset.slot, file = input.files[0];
      const box = main.querySelector(`#slot-${docType}`), st = main.querySelector(`#st-${docType}`);
      const bar = main.querySelector(`#bar-${docType}`), fill = bar.firstElementChild, lbl = main.querySelector(`#btn-${docType} span`);
      const setBar = (pct, txt) => { fill.style.width = pct + '%'; if (txt) st.textContent = txt; };
      box.classList.remove('bad', 'done'); box.classList.add('busy'); bar.style.display = 'block'; setBar(8, 'Preparing…');
      try {
        const { blob, mimeType, sizeBytes } = await compressFile(file, docType, (p) => setBar(8 + p * 0.4, 'Shrinking…'));
        setBar(55, 'Uploading…');
        if (DEMO) {   // demo: nothing leaves the browser
          await new Promise((r) => setTimeout(r, 600)); setBar(85, 'Saving…'); await new Promise((r) => setTimeout(r, 300));
        } else {
          const { uploadUrl, employeeId } = await publicDocGetUploadUrl({ ref: J.ref, dob: J.dob, docType, fileName: file.name, mimeType, sizeBytes });
          const { storageId } = await publicDocUploadBlob(uploadUrl, blob);
          setBar(85, 'Saving…');
          await publicDocConfirm({ ref: J.ref, dob: J.dob, employeeId, docType, storageId, fileName: file.name, mimeType, sizeBytes });
        }
        done.add(docType);
        box.classList.remove('busy'); box.classList.add('done'); bar.style.display = 'none';
        st.textContent = `Uploaded · ${fmtKB(sizeBytes)}`; lbl.textContent = 'Replace';
      } catch (ex) {
        box.classList.remove('busy'); box.classList.add('bad'); bar.style.display = 'none'; st.textContent = ex.message; input.value = '';
      }
      refresh();
    });
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  const J = getJourney();
  if (!J) return viewAuth();
  // Coming from the acceptance page: confirm the session, pick up the brand, go straight to the slots
  (DEMO ? demoLookup() : publicAcceptLookup({ ref: J.ref, dob: J.dob })).then((r) => {
    issuer = r.issuer; rebrand();
    patchJourney({ type: r.employeeType, name: r.holderName });
    viewDocs({ ...J, type: r.employeeType, name: r.holderName });
  }).catch(() => viewAuth());
}
