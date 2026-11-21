// ─── upload.js — Public Document Upload Page (#upload) ───────────────────────
import { publicDocGetUploadUrl, publicDocUploadBlob, publicDocConfirm } from '../api.js';
import { compressFile, fmtKB } from '../utils/compress.js';

import { slotsFor, GROUPS, requirementProgress } from './../utils/docCatalog.js';

export function initUploadPage(app) {
  app.innerHTML = buildUploadHTML();
  attachUploadEvents(app);
}

function buildUploadHTML() {
  return `
<div class="onboard-wrap">
  <div class="onboard-card" style="max-width:720px;" id="upload-card">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 class="onboard-title" style="font-size:1.6rem;">📁 Document Upload Portal</h1>
      <p class="onboard-subtitle">Securely upload your KYC documents. Authenticate with your Reference Number and Date of Birth.</p>
    </div>

    <!-- Step 1: Auth -->
    <div id="upload-auth-section">
      <div class="onboard-section-title">🔐 Verify Your Identity</div>
      <div class="onboard-form-grid">
        <div class="form-group">
          <label class="form-label">Reference Number <span class="req">*</span></label>
          <input id="upl-ref" class="form-input" placeholder="e.g. WS/INT/2026/AI-FS/042" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth <span class="req">*</span></label>
          <input id="upl-dob" class="form-input" type="date" />
        </div>
        <div class="form-group">
          <label class="form-label">Your Type</label>
          <select id="upl-type" class="form-select">
            <option value="intern">Intern</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>
      <p id="upl-auth-err" style="color:var(--red);font-size:0.85rem;min-height:18px;margin-top:4px;"></p>
      <div style="margin-top:16px;">
        <button class="btn-primary" id="btn-upl-auth" style="padding:12px 32px;">Verify & Continue →</button>
      </div>
    </div>

    <!-- Step 2: Document upload slots (shown after auth) -->
    <div id="upload-docs-section" style="display:none;">
      <div class="onboard-section-title" style="margin-top:24px;">📄 Upload Your Documents</div>
      <p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:16px;">
        Upload what you have — ID and photo are required; education certificates (10th, 12th, graduation / ITI / PG, dual degree) help HR complete your verification. Files are auto-compressed in your browser. Accepted: JPG, PNG, WebP, PDF. Max 1.5 MB each.
      </p>
      <div id="upl-slots"></div>
      <div style="margin-top:24px;text-align:center;">
        <p id="upl-global-err" style="color:var(--red);font-size:0.85rem;min-height:18px;"></p>
        <p id="upl-global-ok" style="color:var(--green,#16a34a);font-size:0.9rem;font-weight:600;min-height:18px;"></p>
      </div>
    </div>
  </div>
</div>`;
}

function attachUploadEvents(app) {
  // Auth step
  document.getElementById('btn-upl-auth').addEventListener('click', async () => {
    const ref  = document.getElementById('upl-ref').value.trim();
    const dob  = document.getElementById('upl-dob').value;
    const type = document.getElementById('upl-type').value;
    const errEl = document.getElementById('upl-auth-err');
    errEl.textContent = '';

    if (!ref || !dob) {
      errEl.textContent = 'Please enter your Reference Number and Date of Birth.';
      return;
    }

    // Validate by attempting a dry-run upload URL for a dummy doc slot
    // We pass a dummy file size; backend auth check still runs
    const btn = document.getElementById('btn-upl-auth');
    btn.disabled = true;
    btn.textContent = 'Verifying…';

    try {
      // We'll verify by trying the govt_id slot (always exists)
      await publicDocGetUploadUrl({
        ref, dob, docType: 'photo',
        fileName: 'check.jpg', mimeType: 'image/jpeg', sizeBytes: 1024,
      });
      // Success — show upload slots
      document.getElementById('upload-auth-section').style.display = 'none';
      document.getElementById('upload-docs-section').style.display = '';
      buildDocSlots(ref, dob, slotsFor(type));
    } catch (e) {
      errEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Verify & Continue →';
    }
  });
}

function buildDocSlots(ref, dob, slots) {
  const container = document.getElementById('upl-slots');
  const slotHTML = s => `
<div class="doc-slot" id="slot-${s.type}" style="
  border:1px solid var(--gray-200,#e2e8f0);
  border-radius:10px;padding:16px 20px;margin-bottom:12px;
  background:#fafafa;transition:border-color .2s;
">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
    <div>
      <span style="font-weight:600;color:var(--navy);">${s.label}</span>
      ${s.required ? '<span class="req" style="margin-left:4px;">*</span>' : (s.oneOf ? '<span style="font-size:0.72rem;color:#b45309;margin-left:6px;font-weight:600;">any one required</span>' : '<span style="font-size:0.75rem;color:var(--gray-400);margin-left:6px;">optional</span>')}
      <div style="font-size:0.8rem;color:var(--gray-500);margin-top:2px;">${s.hint}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <span id="slot-status-${s.type}" style="font-size:0.82rem;color:var(--gray-400);">No file selected</span>
      <label class="btn-secondary" style="cursor:pointer;padding:7px 14px;font-size:0.82rem;margin:0;">
        📎 Choose File
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          style="display:none;" id="file-${s.type}"
          onchange="window._handleDocFile('${s.type}','${ref}','${dob}')" />
      </label>
    </div>
  </div>
  <div id="slot-bar-${s.type}" style="display:none;margin-top:10px;">
    <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
      <div id="slot-bar-fill-${s.type}" style="height:100%;background:var(--indigo,#4f46e5);width:0%;transition:width .3s;border-radius:3px;"></div>
    </div>
    <div id="slot-bar-label-${s.type}" style="font-size:0.78rem;color:var(--gray-500);margin-top:4px;"></div>
  </div>
  <div id="slot-err-${s.type}" style="font-size:0.82rem;color:var(--red);margin-top:6px;min-height:14px;"></div>
</div>`;

  const isDone = t => !!document.getElementById(`slot-status-${t}`)?.textContent?.startsWith('✅');
  const required = requirementProgress(slots, () => false).total;
  container.innerHTML = `
<div id="upl-progress" style="font-size:0.85rem;font-weight:600;color:var(--navy);margin-bottom:14px;">0 of ${required} required documents uploaded</div>` +
    GROUPS.map(g => {
      const items = slots.filter(s => s.group === g.id);
      if (!items.length) return '';
      return `<div style="font-size:0.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-600);margin:20px 0 10px;">${g.title}</div>` + items.map(slotHTML).join('');
    }).join('');


  // Global upload handler
  window._handleDocFile = async (docType, ref, dob) => {
    const input = document.getElementById(`file-${docType}`);
    const file = input?.files?.[0];
    if (!file) return;

    const statusEl  = document.getElementById(`slot-status-${docType}`);
    const barEl     = document.getElementById(`slot-bar-${docType}`);
    const barFill   = document.getElementById(`slot-bar-fill-${docType}`);
    const barLabel  = document.getElementById(`slot-bar-label-${docType}`);
    const errEl     = document.getElementById(`slot-err-${docType}`);
    const slotEl    = document.getElementById(`slot-${docType}`);
    errEl.textContent = '';
    barEl.style.display = '';
    statusEl.textContent = 'Compressing…';
    statusEl.style.color = 'var(--gray-500)';
    slotEl.style.borderColor = 'var(--indigo,#4f46e5)';

    const setBar = (pct, label) => {
      barFill.style.width = pct + '%';
      barLabel.textContent = label;
    };

    try {
      // Step 1: Compress
      setBar(10, 'Compressing…');
      const { blob, mimeType, sizeBytes } = await compressFile(file, docType, pct => setBar(pct * 0.5, `Compressing… ${pct}%`));
      setBar(50, `Compressed to ${fmtKB(sizeBytes)} · Getting upload URL…`);

      // Step 2: Get upload URL (auth check)
      const { uploadUrl, employeeId } = await publicDocGetUploadUrl({
        ref, dob, docType,
        fileName: file.name,
        mimeType,
        sizeBytes,
      });
      setBar(60, 'Uploading…');

      // Step 3: Upload blob to Convex Storage
      const { storageId } = await publicDocUploadBlob(uploadUrl, blob);
      setBar(80, 'Saving…');

      // Step 4: Confirm
      await publicDocConfirm({ ref, dob, employeeId, docType, storageId, fileName: file.name, mimeType, sizeBytes });
      setBar(100, `✅ Uploaded — ${fmtKB(sizeBytes)}`);
      barFill.style.background = '#16a34a';
      statusEl.textContent = `✅ ${fmtKB(sizeBytes)}`;
      statusEl.style.color = '#16a34a';
      slotEl.style.borderColor = '#86efac';
      slotEl.style.background = '#f0fdf4';

      // Update requirement progress
      const prog = requirementProgress(slots, isDone);
      const progEl = document.getElementById('upl-progress');
      if (progEl) progEl.textContent = `${prog.done} of ${prog.total} required documents uploaded`;
      document.getElementById('upl-global-ok').style.color = prog.done === prog.total ? '#16a34a' : '#b45309';
      document.getElementById('upl-global-ok').textContent = prog.done === prog.total
        ? '🎉 All required documents uploaded! HR will verify them shortly.'
        : `Still needed: ${prog.missing.join(' · ')}`;
    } catch (e) {
      errEl.textContent = e.message;
      barEl.style.display = 'none';
      statusEl.textContent = '❌ Failed';
      statusEl.style.color = 'var(--red)';
      slotEl.style.borderColor = 'var(--red)';
      input.value = '';
    }
  };
}
