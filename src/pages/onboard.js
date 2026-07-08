// ─── onboard.js — Public Onboarding Form ─────────────────────────────────────
import { publicOnboardEmployee } from '../api.js';
import { LOGO_BASE64 } from '../templates/assets.js';
import { productDropdownHTML } from './shared.js';

export function initOnboardPage(app) {
  app.innerHTML = buildOnboardHTML();
  attachOnboardEvents();
}

function buildOnboardHTML() {
  return `
<div class="onboard-wrap">
  <div class="onboard-card" style="max-width:760px;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="${LOGO_BASE64}" alt="WaveSeed Logo" style="height:72px;object-fit:contain;margin-bottom:14px;" />
      <h1 class="onboard-title">WaveSeed Co. — Onboarding Form</h1>
      <p class="onboard-subtitle">Please fill in all your details. This information will be used to issue your official credentials, certificates, and letters.</p>
    </div>

    <!-- SECTION 1: Personal Information -->
    <div class="onboard-section-title">👤 Personal Information</div>
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
        <label class="form-label">Phone Number <span class="req">*</span></label>
        <input id="onb-phone" class="form-input" type="tel" placeholder="e.g. +91 9876543210" required />
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input id="onb-dob" class="form-input" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">Gender</label>
        <select id="onb-gender" class="form-select">
          <option value="">Prefer not to say</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group" style="grid-column: span 2;">
        <label class="form-label">Current Address</label>
        <input id="onb-address" class="form-input" placeholder="e.g. Hyderabad, Telangana, India" />
      </div>
    </div>

    <!-- SECTION 2: Academic Background -->
    <div class="onboard-section-title">🎓 Academic Background</div>
    <div class="onboard-form-grid">
      <div class="form-group" style="grid-column: span 2;">
        <label class="form-label">College / University <span class="req">*</span></label>
        <input id="onb-institution" class="form-input" placeholder="e.g. Samskruti College of Engineering and Technology" required />
      </div>
      <div class="form-group">
        <label class="form-label">Department / Branch <span class="req">*</span></label>
        <input id="onb-dept" class="form-input" placeholder="e.g. Computer Science & Engineering" required />
      </div>
      <div class="form-group">
        <label class="form-label">Degree / Programme</label>
        <input id="onb-degree" class="form-input" placeholder="e.g. B.Tech, M.Tech, BCA, MBA" />
      </div>
      <div class="form-group">
        <label class="form-label">Year of Graduation</label>
        <input id="onb-grad-year" class="form-input" placeholder="e.g. 2025" maxlength="4" />
      </div>
      <div class="form-group">
        <label class="form-label">CGPA / Percentage <span class="req">*</span></label>
        <input id="onb-gpa" class="form-input" placeholder="e.g. 9.1 CGPA / 88%" required />
      </div>
    </div>

    <!-- SECTION 3: Previous Employment -->
    <div class="onboard-section-title">💼 Previous Employment</div>
    <div class="onboard-form-grid" style="grid-template-columns:1fr;">
      <div class="form-group">
        <label class="form-label">Were you previously employed?</label>
        <div style="display:flex;gap:16px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.9rem;">
            <input type="radio" name="prev-emp" value="no" id="onb-prev-no" checked /> No, this is my first role
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.9rem;">
            <input type="radio" name="prev-emp" value="yes" id="onb-prev-yes" /> Yes, I have work experience
          </label>
        </div>
      </div>
    </div>

    <div id="prev-emp-section" style="display:none;">
      <div class="onboard-form-grid">
        <div class="form-group">
          <label class="form-label">Previous Employer Name</label>
          <input id="onb-prev-employer" class="form-input" placeholder="e.g. Infosys Ltd." />
        </div>
        <div class="form-group">
          <label class="form-label">Designation at Previous Employer</label>
          <input id="onb-prev-designation" class="form-input" placeholder="e.g. Junior Developer" />
        </div>
        <div class="form-group">
          <label class="form-label">Employment Duration — From</label>
          <input id="onb-prev-from" class="form-input" type="month" />
        </div>
        <div class="form-group">
          <label class="form-label">Employment Duration — To</label>
          <input id="onb-prev-to" class="form-input" type="month" />
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Key Responsibilities</label>
          <textarea id="onb-prev-responsibilities" class="form-textarea" placeholder="Briefly describe your key responsibilities and achievements…" style="min-height:80px;"></textarea>
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Reason for Leaving</label>
          <input id="onb-prev-reason" class="form-input" placeholder="e.g. Career growth, better opportunity, relocation…" />
        </div>
      </div>
    </div>

    <!-- SECTION 4: WaveSeed Role Details -->
    <div class="onboard-section-title">🌊 WaveSeed Role Details</div>
    <div class="onboard-form-grid">
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
        ${productDropdownHTML('onb-product')}
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
        <label class="form-label">Start Date <span class="req">*</span></label>
        <input id="onb-start" class="form-input" type="date" required />
      </div>
      <div class="form-group">
        <label class="form-label">End Date / Expected End Date</label>
        <input id="onb-end" class="form-input" type="date" />
      </div>
      <div class="form-group" style="grid-column: span 2;">
        <label class="form-label">Any additional notes or skills to share?</label>
        <textarea id="onb-notes" class="form-textarea" placeholder="e.g. Skills, certifications, languages, tools you work with…" style="min-height:70px;"></textarea>
      </div>
    </div>

    <div style="margin-top:24px;text-align:center;">
      <p id="onb-error" style="color:var(--red);font-size:0.85rem;margin-bottom:10px;min-height:20px;"></p>
      <button class="btn-primary" id="btn-onboard-submit" style="width:100%;max-width:280px;padding:14px 24px;font-size:1rem;">Submit Profile →</button>
    </div>
  </div>
</div>`;
}

function attachOnboardEvents() {
  // Toggle previous employment section
  document.querySelectorAll('input[name="prev-emp"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const hasPrev = document.getElementById('onb-prev-yes').checked;
      document.getElementById('prev-emp-section').style.display = hasPrev ? '' : 'none';
    });
  });

  document.getElementById('btn-onboard-submit').addEventListener('click', async () => {
    const name         = document.getElementById('onb-name').value.trim();
    const email        = document.getElementById('onb-email').value.trim();
    const phone        = document.getElementById('onb-phone').value.trim();
    const dob          = document.getElementById('onb-dob').value;
    const gender       = document.getElementById('onb-gender').value;
    const address      = document.getElementById('onb-address').value.trim();
    const institution  = document.getElementById('onb-institution').value.trim();
    const dept         = document.getElementById('onb-dept').value.trim();
    const degree       = document.getElementById('onb-degree').value.trim();
    const gradYear     = document.getElementById('onb-grad-year').value.trim();
    const gpa          = document.getElementById('onb-gpa').value.trim();
    const hasPrev      = document.getElementById('onb-prev-yes').checked;
    const type         = document.getElementById('onb-type').value;
    const role         = document.getElementById('onb-role').value.trim();
    const productSel  = document.getElementById('onb-product').value;
    const product      = productSel === '__custom__'
      ? document.getElementById('onb-product-custom').value.trim()
      : productSel;
    const workMode     = document.getElementById('onb-workmode').value;
    const start        = document.getElementById('onb-start').value;
    const end          = document.getElementById('onb-end').value;
    const notes        = document.getElementById('onb-notes').value.trim();

    const err = document.getElementById('onb-error');
    err.textContent = '';

    if (!name || !email || !phone || !institution || !dept || !gpa || !role || !product || !start) {
      err.textContent = 'Please fill out all required fields (*).';
      return;
    }

    // Build meta object with all extended fields
    const meta = {
      phone, dob, gender, address,
      degree, gradYear, gpa,
      previouslyEmployed: hasPrev,
      notes,
    };

    if (hasPrev) {
      meta.prevEmployer        = document.getElementById('onb-prev-employer').value.trim();
      meta.prevDesignation     = document.getElementById('onb-prev-designation').value.trim();
      meta.prevFrom            = document.getElementById('onb-prev-from').value;
      meta.prevTo              = document.getElementById('onb-prev-to').value;
      meta.prevResponsibilities = document.getElementById('onb-prev-responsibilities').value.trim();
      meta.prevReasonLeaving   = document.getElementById('onb-prev-reason').value.trim();
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
        department: `${dept} (${gpa})`,
        startDate: start,
        endDate: end || undefined,
        meta: JSON.stringify(meta),
      });

      // Show success
      document.querySelector('.onboard-card').innerHTML = `
<div style="text-align:center;padding:48px 20px;">
  <div style="font-size:4rem;margin-bottom:16px;">🎉</div>
  <h2 style="color:var(--navy);font-size:1.8rem;margin-bottom:12px;">Profile Submitted Successfully!</h2>
  <p style="color:var(--gray-600);line-height:1.7;max-width:480px;margin:0 auto 24px;">
    Hi <strong>${esc(name)}</strong>, your onboarding details have been securely saved to the WaveSeed registry.<br><br>
    Our HR team will review your profile and reach out to you at <strong>${esc(email)}</strong> shortly.
  </p>
  <button class="btn-primary" onclick="window.location.reload()" style="padding:12px 24px;">Submit Another Profile</button>
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
