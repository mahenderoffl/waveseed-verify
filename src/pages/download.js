// --- download.js --- Secure Recipient Document Download -----------------------
import { publicDownload, publicUploadSigned } from '../api.js';
import { generateDocument } from '../templates/templates.js';

// Browser-side image downscaling and compression helper
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initDownloadPage(app) {
  // Pre-fill ref from URL query param if provided
  const urlRef = new URLSearchParams(window.location.hash.split('?')[1] || '').get('ref') || '';

  app.innerHTML = `
<div id="download-page">
  <div class="dl-bg"></div>
  <div class="dl-container">

    <!-- Header -->
    <div class="dl-header">
      <div class="dl-logo">
        <span class="dl-logo-wave">Wave</span><span class="dl-logo-seed">Seed</span>
      </div>
      <div class="dl-logo-sub">Co.</div>
    </div>

    <!-- Card -->
    <div class="dl-card">
      <div class="dl-card-icon">📄</div>
      <h1 class="dl-title">Access Your Document</h1>
      <p class="dl-desc">
        Enter your <strong>Reference Number</strong> (found in your offer email or letter)
        and your <strong>Date of Birth</strong> to securely access and download your document.
      </p>

      <div class="dl-form">
        <div class="dl-field">
          <label class="dl-label" for="dl-ref">Reference Number</label>
          <input
            id="dl-ref"
            class="dl-input"
            type="text"
            placeholder="e.g. WS/INT/2026/AI-FS/043"
            value="${urlRef}"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="dl-field">
          <label class="dl-label" for="dl-dob">Date of Birth</label>
          <input
            id="dl-dob"
            class="dl-input"
            type="date"
          />
        </div>

        <button class="dl-btn" id="dl-submit">
          <span id="dl-btn-text">🔓 Access Document</span>
          <div class="dl-btn-spinner" id="dl-spinner" style="display:none;"></div>
        </button>

        <p class="dl-error" id="dl-error"></p>
        <div class="dl-attempts" id="dl-attempts"></div>
      </div>
    </div>

    <!-- Info strip -->
    <div class="dl-info">
      <div class="dl-info-item">🔒 <span>Secure — no document stored server-side</span></div>
      <div class="dl-info-item">♾️ <span>Link works anytime — not one-time</span></div>
      <div class="dl-info-item">🖨️ <span>Print or Save as PDF once opened</span></div>
    </div>

    <!-- Footer -->
    <div class="dl-footer">
      <a href="/" class="dl-footer-link">← Verify a Certificate</a>
      <span class="dl-footer-sep">·</span>
      <span class="dl-footer-brand">WaveSeed Co.</span>
    </div>

  </div>
</div>`;

  const refEl      = document.getElementById('dl-ref');
  const dobEl      = document.getElementById('dl-dob');
  const btn        = document.getElementById('dl-submit');
  const btnText    = document.getElementById('dl-btn-text');
  const spinner    = document.getElementById('dl-spinner');
  const errorEl    = document.getElementById('dl-error');
  const attemptsEl = document.getElementById('dl-attempts');
  const dlCard     = document.querySelector('.dl-card');

  if (urlRef) dobEl.focus();
  else refEl.focus();

  const setLoading = (on) => {
    btn.disabled = on;
    btnText.style.display = on ? 'none' : 'inline';
    spinner.style.display = on ? 'block' : 'none';
  };

  const showError = (msg, attemptsLeft) => {
    errorEl.textContent = msg;
    errorEl.style.color = '#dc2626';
    errorEl.style.display = msg ? 'block' : 'none';
    if (attemptsLeft !== undefined && attemptsLeft > 0) {
      attemptsEl.textContent = `⚠️ ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before lockout`;
      attemptsEl.style.display = 'block';
    } else {
      attemptsEl.style.display = 'none';
    }
  };

  const submit = async () => {
    const ref = refEl.value.trim();
    const dob = dobEl.value.trim();
    showError('');

    if (!ref) { showError('Please enter your Reference Number.'); refEl.focus(); return; }
    if (!dob) { showError('Please enter your Date of Birth.'); dobEl.focus(); return; }

    setLoading(true);
    try {
      const result = await publicDownload({ ref, dob });

      let data = {};
      if (result.templateData) {
        try { data = JSON.parse(result.templateData); } catch { data = {}; }
      }
      data.certId            = result.certificateId;
      data.refNum            = result.referenceNumber;
      data.holderName        = result.holderName;
      data.recipientName     = result.holderName;
      data.recipientEmail    = result.holderEmail        || data.recipientEmail  || '';
      data.recipientCollege  = result.holderInstitution  || data.recipientCollege || '';
      data.recipientDept     = result.holderDepartment   || data.recipientDept   || '';
      data.holderInstitution = result.holderInstitution  || data.holderInstitution || '';
      data.holderDepartment  = result.holderDepartment   || data.holderDepartment  || '';
      data.role              = result.role;
      data.product           = result.product     || data.product     || '';
      data.reportingTo       = result.reportingTo || data.reportingTo || '';
      data.workMode          = result.workMode    || data.workMode    || '';
      data.issuedDate        = result.issuedDate  || data.issuedDate  || '';
      data.date              = result.issuedDate  || data.date        || '';
      data.startDate         = result.startDate   || data.startDate   || '';
      data.endDate           = result.endDate     || data.endDate     || '';
      data.issuerName        = result.issuerName  || data.issuerName  || 'Mahender';
      data.issuerTitle       = result.issuerTitle || data.issuerTitle || 'Founder, WaveSeed Co.';
      data.verificationId    = result.certificateId;
      data.certType          = result.certificateType.replace('-cert', '');

      const html = generateDocument(result.certificateType, data);

      // Open new window function
      const openDocWindow = () => {
        const win = window.open('', '_blank', 'width=1100,height=860');
        if (!win) {
          alert('Popup blocked. Please allow popups for this site.');
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
      };

      // Open immediately on first auth
      openDocWindow();

      // Replace card with success action panel
      dlCard.innerHTML = `
<div class="dl-success-panel" style="text-align:left;">
  <div style="text-align:center; margin-bottom:16px;">
    <div style="font-size:3rem; margin-bottom:8px;">✅</div>
    <h2 style="font-size:1.25rem; font-weight:700; color:var(--navy);">Document Authenticated</h2>
    <p style="font-size:0.8rem; color:#64748b; margin-top:4px;">Reference: ${esc(result.referenceNumber)}</p>
  </div>

  <button class="dl-btn" id="dl-open-doc" style="margin-bottom:20px; background:var(--navy);">
    👁️ View &amp; Print Document
  </button>

  ${(result.certificateType === 'internship-offer' || result.certificateType === 'employment-offer') ? `
    <div class="dl-upload-section" style="border-top:1px solid #e2e8f0; padding-top:20px; margin-top:20px;">
      <h3 style="font-size:0.92rem; color:var(--navy); font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
        📤 Upload Signed Acceptance Copy
      </h3>
      <p style="font-size:0.75rem; color:#64748b; margin-bottom:14px; line-height:1.4;">
        If you have printed and signed this document, scan it (as PDF or Image) and upload it here to complete your onboarding acceptance.
      </p>

      <div id="upload-status-box" style="margin-bottom:14px;">
        ${result.signedUrl ? `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#166534;">
            <div>
              <strong style="display:flex; align-items:center; gap:4px;">✅ Signed Copy Attached</strong>
              <span style="font-size:0.7rem; color:#15803d; display:block; margin-top:2px;">Uploaded on ${new Date(result.signedAt).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
            </div>
            <a href="${result.signedUrl}" target="_blank" style="color:#166534; font-weight:700; text-decoration:underline; font-size:0.75rem;">Download Copy</a>
          </div>
        ` : `
          <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:12px; text-align:center; font-size:0.75rem; color:#64748b;">
            No signed copy uploaded yet.
          </div>
        `}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <input type="file" id="signed-file-input" accept="application/pdf,image/*" style="display:none;" />
        <button class="dl-btn" id="btn-select-file" style="background:#c9a227; font-size:0.82rem; padding:10px 14px;">
          ✍️ Select Signed File
        </button>
        <p id="upload-error-msg" style="color:#dc2626; font-size:0.72rem; display:none; margin-top:2px;"></p>
        
        <div id="upload-progress-container" style="display:none; margin-top:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#475569; margin-bottom:4px;">
            <span id="upload-progress-text">Preparing...</span>
            <span id="upload-progress-pct">0%</span>
          </div>
          <div style="width:100%; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden;">
            <div id="upload-progress-bar" style="width:0%; height:100%; background:var(--navy); transition:width 0.2s;"></div>
          </div>
        </div>
      </div>
    </div>
  ` : ''}

  <button class="dl-btn-secondary" onclick="window.location.reload()" style="margin-top:24px; width:100%; border:1px solid #cbd5e1; background:transparent; color:#475569; padding:10px; font-size:0.8rem; border-radius:6px; cursor:pointer; font-weight:600;">
    ← Back to Access Form
  </button>
</div>`;

      // Attach success panel events
      document.getElementById('dl-open-doc').addEventListener('click', openDocWindow);

      const fileInput = document.getElementById('signed-file-input');
      const selectBtn = document.getElementById('btn-select-file');
      const uploadErr = document.getElementById('upload-error-msg');
      const statusBox = document.getElementById('upload-status-box');
      const progressContainer = document.getElementById('upload-progress-container');
      const progressText = document.getElementById('upload-progress-text');
      const progressBar = document.getElementById('upload-progress-bar');
      const progressPct = document.getElementById('upload-progress-pct');

      if (selectBtn && fileInput) {
        selectBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          uploadErr.style.display = 'none';
          progressContainer.style.display = 'block';
          progressBar.style.width = '0%';
          progressPct.textContent = '0%';
          progressText.textContent = 'Preparing file…';
          selectBtn.disabled = true;

          try {
            let fileToUpload = file;

            // Image compression
            if (file.type.startsWith('image/')) {
              progressText.textContent = 'Compressing image…';
              progressBar.style.width = '20%';
              progressPct.textContent = '20%';
              fileToUpload = await compressImage(file);
            }

            // Size limit check (4MB)
            const sizeMb = fileToUpload.size / (1024 * 1024);
            if (sizeMb > 4.0) {
              throw new Error(`File is too large (${sizeMb.toFixed(2)} MB). Max limit is 4MB.`);
            }

            progressText.textContent = 'Uploading to secure vault…';
            progressBar.style.width = '60%';
            progressPct.textContent = '60%';

            const uploadRes = await publicUploadSigned({
              ref,
              dob,
              file: fileToUpload
            });

            progressBar.style.width = '100%';
            progressPct.textContent = '100%';
            progressText.textContent = 'Upload complete!';

            statusBox.innerHTML = `
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#166534; animation: fadeIn 0.4s;">
                <div>
                  <strong style="display:flex; align-items:center; gap:4px;">✅ Signed Copy Attached</strong>
                  <span style="font-size:0.7rem; color:#15803d; display:block; margin-top:2px;">Uploaded just now</span>
                </div>
                <a href="${uploadRes.signedUrl}" target="_blank" style="color:#166534; font-weight:700; text-decoration:underline; font-size:0.75rem;">Download Copy</a>
              </div>`;

          } catch (err) {
            uploadErr.textContent = err.message || 'Upload failed. Please try again.';
            uploadErr.style.display = 'block';
          } finally {
            selectBtn.disabled = false;
            setTimeout(() => {
              progressContainer.style.display = 'none';
            }, 3000);
          }
        });
      }

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.', err.remaining);
    } finally {
      setLoading(false);
    }
  };

  btn.addEventListener('click', submit);
  [refEl, dobEl].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
}
