// --- download.js --- Secure Recipient Document Download -----------------------
import { publicDownload } from '../api.js';
import { generateDocument } from '../templates/templates.js';

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

      const win = window.open('', '_blank', 'width=1100,height=860');
      if (!win) {
        showError('⚠️ Popup blocked. Please allow popups for this site and try again.');
        setLoading(false);
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();

      errorEl.textContent = '✅ Document opened in a new tab — use Print → Save as PDF to download.';
      errorEl.style.color = '#059669';
      errorEl.style.display = 'block';
      attemptsEl.style.display = 'none';

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.', err.remaining);
    } finally {
      setLoading(false);
    }
  };

  btn.addEventListener('click', submit);
  [refEl, dobEl].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
}
