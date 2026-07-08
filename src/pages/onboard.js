// ─── onboard.js — Public Onboarding Form ─────────────────────────────────────
import { publicOnboardEmployee } from '../api.js';
import { LOGO_BASE64 } from '../templates/assets.js';

export function initOnboardPage(app) {
  app.innerHTML = buildOnboardHTML();
  attachOnboardEvents();
}

function buildOnboardHTML() {
  return `
<div class="onboard-wrap">
  <div class="onboard-card">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:64px;object-fit:contain;margin-bottom:12px;" />
      <h1 class="onboard-title">WaveSeed Co. Onboarding Form</h1>
      <p class="onboard-subtitle">Please enter your credentials to register in the database. This data will be used to issue your official credentials, certificates, and letters.</p>
    </div>

    <div class="onboard-form-grid">
      <div class="form-group">
        <label class="form-label">Full Name <span class="req">*</span></label>
        <input id="onb-name" class="form-input" placeholder="e.g. John Doe" required />
      </div>
      
      <div class="form-group">
        <label class="form-label">Email Address <span class="req">*</span></label>
        <input id="onb-email" class="form-input" type="email" placeholder="e.g. johndoe@example.com" required />
      </div>

      <div class="form-group">
        <label class="form-label">Onboarding Type <span class="req">*</span></label>
        <select id="onb-type" class="form-select">
          <option value="intern">Intern Profile</option>
          <option value="employee">Full-time Employee Profile</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Role / Designation <span class="req">*</span></label>
        <input id="onb-role" class="form-input" placeholder="e.g. AI Full Stack Developer Intern" required />
      </div>

      <div class="form-group">
        <label class="form-label">Project / Product Name <span class="req">*</span></label>
        <input id="onb-product" class="form-input" placeholder="e.g. WaveBase AI" value="WaveBase AI" required />
      </div>

      <div class="form-group">
        <label class="form-label">Work Mode <span class="req">*</span></label>
        <select id="onb-workmode" class="form-select">
          <option value="Remote">Remote</option>
          <option value="On-site">On-site</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">College / Previous Organization <span class="req">*</span></label>
        <input id="onb-institution" class="form-input" placeholder="e.g. Samskruti College of Engineering" required />
      </div>

      <div class="form-group">
        <label class="form-label">Department / Branch <span class="req">*</span></label>
        <input id="onb-dept" class="form-input" placeholder="e.g. Computer Science & Engineering" required />
      </div>

      <div class="form-group">
        <label class="form-label">CGPA / Percentage / Grade <span class="req">*</span></label>
        <input id="onb-gpa" class="form-input" placeholder="e.g. 9.1 CGPA / 88%" required />
      </div>

      <div class="form-group">
        <label class="form-label">Start Date <span class="req">*</span></label>
        <input id="onb-start" class="form-input" type="date" required />
      </div>

      <div class="form-group" style="grid-column: span 2;">
        <label class="form-label">End Date <span class="req">*</span></label>
        <input id="onb-end" class="form-input" type="date" required />
      </div>
    </div>

    <div style="margin-top:20px;text-align:center;">
      <p id="onb-error" style="color:var(--red);font-size:0.85rem;margin-bottom:10px;min-height:20px;"></p>
      <button class="btn-primary" id="btn-onboard-submit" style="width:100%;max-width:240px;padding:12px 24px;font-size:0.95rem;">Submit Profile →</button>
    </div>
  </div>
</div>`;
}

function attachOnboardEvents() {
  document.getElementById('btn-onboard-submit').addEventListener('click', async () => {
    const name = document.getElementById('onb-name').value.trim();
    const email = document.getElementById('onb-email').value.trim();
    const type = document.getElementById('onb-type').value;
    const role = document.getElementById('onb-role').value.trim();
    const product = document.getElementById('onb-product').value.trim();
    const workMode = document.getElementById('onb-workmode').value;
    const institution = document.getElementById('onb-institution').value.trim();
    const dept = document.getElementById('onb-dept').value.trim();
    const gpa = document.getElementById('onb-gpa').value.trim();
    const start = document.getElementById('onb-start').value;
    const end = document.getElementById('onb-end').value;

    const err = document.getElementById('onb-error');
    err.textContent = '';

    if (!name || !email || !role || !product || !start || !end || !institution || !dept || !gpa) {
      err.textContent = 'Please fill out all required fields (*).';
      return;
    }

    const btn = document.getElementById('btn-onboard-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      await publicOnboardEmployee({
        name,
        email,
        employeeType: type,
        role,
        product,
        workMode,
        institution,
        department: `${dept} (${gpa})`, // Store CGPA alongside department for admin visibility
        startDate: start,
        endDate: end,
      });

      // Show success
      document.querySelector('.onboard-card').innerHTML = `
<div style="text-align:center;padding:40px 10px;">
  <div style="font-size:4rem;margin-bottom:16px;">🎉</div>
  <h2 style="color:var(--navy);font-size:1.8rem;margin-bottom:12px;">Profile Submitted Successfully!</h2>
  <p style="color:var(--gray-600);line-height:1.6;max-width:420px;margin:0 auto 24px;">
    Hi <strong>${esc(name)}</strong>, your onboarding details have been securely saved to the WaveSeed registry database.<br><br>
    The administration team can now issue your credentials, certificates, or letters without manual entry.
  </p>
  <button class="btn-primary" onclick="window.location.reload()" style="padding:10px 20px;">Submit Another Profile</button>
</div>`;
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Submit Profile →';
    }
  });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
