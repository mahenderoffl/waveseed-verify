// ─── generate.js — Document Generation Dashboard ──────────────────────────────
import { generateDocument } from '../templates/templates.js';
import { adminGetAll, adminGetEmployees, adminGetNextIds, adminAddCertificate } from '../api.js';

// ─── Document Type Catalogue ───────────────────────────────────────────────────
const DOC_TYPES = [
  // ── Certificates ─────────────────────────────────────────────────────────────
  {
    id:'internship-cert', cat:'certificate', icon:'🎓',
    name:'Internship Completion', color:'#0d1b3e',
    desc:'Certificate for successfully completing an internship at WaveSeed Co.',
    fields:['certId','refNum','holderName','holderInstitution','holderDepartment','role','product','workMode','startDate','endDate','issuedDate','customMessage'],
  },
  {
    id:'employment-cert', cat:'certificate', icon:'💼',
    name:'Employment Certificate', color:'#1e3264',
    desc:'Proof of employment / service certificate for current or former employees.',
    fields:['certId','refNum','holderName','role','startDate','endDate','issuedDate','customMessage'],
  },
  {
    id:'course-cert', cat:'certificate', icon:'📚',
    name:'Course Completion', color:'#7c3aed',
    desc:'Certificate for completing a course, training, or workshop at WaveSeed.',
    fields:['certId','refNum','holderName','holderInstitution','role','product','startDate','endDate','issuedDate','customMessage'],
  },
  {
    id:'appreciation-cert', cat:'certificate', icon:'⭐',
    name:'Appreciation Certificate', color:'#c9a227',
    desc:'Certificate of appreciation for outstanding contributions and dedication.',
    fields:['certId','refNum','holderName','holderInstitution','role','issuedDate','customMessage'],
  },
  {
    id:'achievement-cert', cat:'certificate', icon:'🏆',
    name:'Excellence / Achievement', color:'#059669',
    desc:'Certificate of excellence for top-performing interns or employees.',
    fields:['certId','refNum','holderName','holderInstitution','role','issuedDate','customMessage'],
  },
  {
    id:'volunteer-cert', cat:'certificate', icon:'🤲',
    name:'Volunteer Recognition', color:'#0891b2',
    desc:'Certificate recognising volunteer contributions to WaveSeed projects.',
    fields:['certId','refNum','holderName','holderInstitution','role','startDate','endDate','issuedDate','customMessage'],
  },
  // ── Letters ──────────────────────────────────────────────────────────────────
  {
    id:'internship-offer', cat:'letter', icon:'📝',
    name:'Internship Offer Letter', color:'#0d1b3e',
    desc:'Official offer letter for interns — with role, duration, stipend & T&C.',
    fields:['certId','refNum','date','recipientName','recipientCollege','recipientDept','recipientEmail','role','product','reportingTo','startDate','endDate','duration','workHours','workMode','stipend'],
  },
  {
    id:'employment-offer', cat:'letter', icon:'📋',
    name:'Employment Offer Letter', color:'#1e3264',
    desc:'Full-time employment offer with designation, CTC, and probation terms.',
    fields:['certId','refNum','date','recipientName','role','department','reportingTo','joiningDate','workMode','ctc','probation'],
  },
  {
    id:'experience-letter', cat:'letter', icon:'📄',
    name:'Experience / Service Letter', color:'#475569',
    desc:'Service verification letter confirming tenure and role for ex-employees.',
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','responsibilities','conduct'],
  },
  {
    id:'relieving-letter', cat:'letter', icon:'🤝',
    name:'Relieving Letter', color:'#059669',
    desc:'Formal letter confirming the employee is relieved of all duties.',
    fields:['certId','refNum','date','recipientName','role','relievingDate'],
  },
  {
    id:'termination-letter', cat:'letter', icon:'⛔',
    name:'Termination Letter', color:'#dc2626',
    desc:'Official letter terminating employment or internship with reason.',
    fields:['certId','refNum','date','recipientName','role','terminationDate','reason','finalSettlement'],
  },
  {
    id:'lor', cat:'letter', icon:'🌟',
    name:'Letter of Recommendation', color:'#c9a227',
    desc:'Strong LOR for outstanding interns or employees, suitable for jobs or admissions.',
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','strengths','achievements','recommendation'],
  },
  {
    id:'noc', cat:'letter', icon:'✅',
    name:'No Objection Certificate', color:'#0891b2',
    desc:'NOC for further studies, visa applications, or external opportunities.',
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','purpose'],
  },
  {
    id:'promotion-letter', cat:'letter', icon:'🚀',
    name:'Promotion Letter', color:'#7c3aed',
    desc:'Formal promotion confirmation with new designation and revised CTC.',
    fields:['certId','refNum','date','recipientName','oldRole','newRole','effectiveDate','reportingTo','newCtc'],
  },
  {
    id:'salary-revision', cat:'letter', icon:'💰',
    name:'Salary Revision Letter', color:'#0d9488',
    desc:'Letter confirming salary increment or revision.',
    fields:['certId','refNum','date','recipientName','role','oldSalary','newSalary','effectiveDate'],
  },
  {
    id:'warning-letter', cat:'letter', icon:'⚠️',
    name:'Warning / Show Cause Notice', color:'#dc2626',
    desc:'Formal warning or show cause notice for disciplinary action.',
    fields:['certId','refNum','date','recipientName','role','warningType','incident','responseDeadline'],
  },
];

// ─── Field Definitions ─────────────────────────────────────────────────────────
const FIELD_DEF = {
  certId:          { label:'Verification ID',       ph:'WS-CERT-2026-0043',        req:true },
  refNum:          { label:'Reference Number',      ph:'WS/INT/2026/AI-FS/043',   req:true },
  holderName:      { label:'Holder / Recipient Name', ph:'Full Name',             req:true },
  holderInstitution:{ label:'Institution / Organization', ph:'College or Company' },
  holderDepartment:{ label:'Department / Branch',   ph:'e.g. AI & ML (CSM)' },
  role:            { label:'Role / Designation',    ph:'e.g. AI Full Stack Developer Intern', req:true },
  product:         { label:'Project / Product',     ph:'e.g. WaveBase AI',        def:'WaveBase AI' },
  workMode:        { label:'Work Mode',             type:'select', opts:['','Remote','On-site','Hybrid'] },
  startDate:       { label:'Start Date',            type:'date' },
  endDate:         { label:'End Date',              type:'date' },
  issuedDate:      { label:'Date of Issue',         type:'date', req:true },
  customMessage:   { label:'Custom Body Text (optional)', type:'textarea', ph:'Leave blank for auto-generated text' },
  // Letter-specific
  date:            { label:'Letter Date',           type:'date', req:true },
  recipientName:   { label:'Recipient Full Name',   ph:'Full Name',               req:true },
  recipientCollege:{ label:'College / Institution', ph:'Samskruti College of Engineering and Technology' },
  recipientDept:   { label:'Branch / Department',   ph:'Artificial Intelligence & Machine Learning (CSM)' },
  recipientEmail:  { label:'Recipient Email',       ph:'email@example.com',       type:'email' },
  reportingTo:     { label:'Reporting To',          ph:'Chief Developer, WaveSeed Co.', def:'Chief Developer, WaveSeed Co.' },
  duration:        { label:'Duration',              ph:'2 Months',                def:'2 Months' },
  workHours:       { label:'Working Hours',         ph:'4–5 Hours per Day',       def:'4–5 Hours per Day' },
  stipend:         { label:'Stipend',               ph:'e.g. Unpaid / ₹X per month', def:'Unpaid Internship' },
  department:      { label:'Department',            ph:'Engineering, Design…' },
  joiningDate:     { label:'Date of Joining',       type:'date' },
  ctc:             { label:'CTC / Compensation',    ph:'e.g. ₹4 LPA or ₹25,000/month' },
  probation:       { label:'Probation Period',      ph:'3 Months',                def:'3 Months' },
  responsibilities:{ label:'Key Responsibilities',  type:'textarea', ph:'Describe primary responsibilities during tenure' },
  conduct:         { label:'Conduct & Performance', ph:'satisfactory',            def:'satisfactory' },
  relievingDate:   { label:'Relieving Date',        type:'date', req:true },
  terminationDate: { label:'Termination Effective Date', type:'date', req:true },
  reason:          { label:'Reason for Termination', type:'textarea', ph:'Describe the reason (leave blank if not disclosing)' },
  finalSettlement: { label:'Final Settlement Details', ph:'e.g. All dues cleared as of [date]' },
  strengths:       { label:'Key Strengths',         type:'textarea', ph:'Describe key strengths and qualities' },
  achievements:    { label:'Notable Achievements',  type:'textarea', ph:'Describe significant achievements' },
  recommendation:  { label:'Custom Recommendation Text', type:'textarea', ph:'Leave blank for auto-generated text' },
  purpose:         { label:'Purpose of NOC',        ph:'e.g. Higher studies / Visa / Further employment', req:true },
  oldRole:         { label:'Previous Designation',  ph:'Previous role title' },
  newRole:         { label:'New Designation',       ph:'New promoted role title', req:true },
  effectiveDate:   { label:'Effective Date',        type:'date', req:true },
  newCtc:          { label:'Revised CTC / Compensation', ph:'e.g. ₹6 LPA' },
  oldSalary:       { label:'Previous Compensation', ph:'e.g. ₹4 LPA' },
  newSalary:       { label:'Revised Compensation',  ph:'e.g. ₹6 LPA', req:true },
  warningType:     { label:'Notice Type', type:'select', opts:['warning','showcause'], optLabels:['Warning Letter','Show Cause Notice'], req:true },
  incident:        { label:'Incident / Reason',     type:'textarea', ph:'Describe the incident or reason for notice', req:true },
  responseDeadline:{ label:'Response Deadline',     ph:'e.g. 48 hours, 3 working days' },
};

// ─── Page Init ─────────────────────────────────────────────────────────────────
let adminToken = null;
let existingCerts = [];
let existingEmployees = [];

export async function initGeneratePage(mainEl, token) {
  adminToken = token;
  mainEl.innerHTML = buildGenerateHTML();
  attachGenerateEvents();
  try {
    const [certs, emps] = await Promise.all([
      adminGetAll(token),
      adminGetEmployees(token),
    ]);
    existingCerts = certs;
    existingEmployees = emps;
  } catch {
    existingCerts = [];
    existingEmployees = [];
  }
  renderDocGrid('all');
}

// ─── HTML Shell ────────────────────────────────────────────────────────────────
function buildGenerateHTML() {
  return `
<div class="admin-topbar">
  <div>
    <div class="admin-page-title">📄 Generate Documents</div>
    <div class="admin-page-subtitle">Create print-ready certificates and official letters — all WaveSeed branded</div>
  </div>
  <div style="display:flex;gap:8px;">
    <span style="font-size:0.78rem;color:var(--gray-400);align-self:center;">${DOC_TYPES.length} document types available</span>
  </div>
</div>
<div class="admin-content">
  <!-- Category Filter -->
  <div class="gen-filter-tabs" id="gen-tabs">
    <button class="gen-tab active" data-cat="all">All Documents</button>
    <button class="gen-tab" data-cat="certificate">🎓 Certificates</button>
    <button class="gen-tab" data-cat="letter">📝 Letters</button>
  </div>
  <!-- Document Grid -->
  <div class="doc-grid" id="doc-grid"></div>
</div>`;
}

function attachGenerateEvents() {
  document.getElementById('gen-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.gen-tab');
    if (!tab) return;
    document.querySelectorAll('.gen-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderDocGrid(tab.dataset.cat);
  });
}

function renderDocGrid(cat) {
  const grid = document.getElementById('doc-grid');
  const filtered = cat === 'all' ? DOC_TYPES : DOC_TYPES.filter(d => d.cat === cat);
  grid.innerHTML = filtered.map(doc => `
<div class="doc-card" data-id="${doc.id}" style="--doc-color:${doc.color}">
  <div class="doc-card-icon">${doc.icon}</div>
  <div class="doc-card-cat">${doc.cat === 'certificate' ? '🎓 Certificate' : '📝 Letter'}</div>
  <div class="doc-card-name">${doc.name}</div>
  <div class="doc-card-desc">${doc.desc}</div>
  <button class="doc-card-btn" onclick="window.wsOpenGenForm('${doc.id}')">Generate →</button>
</div>`).join('');
}

// ─── Form Modal ────────────────────────────────────────────────────────────────
window.wsOpenGenForm = async function(typeId) {
  const docType = DOC_TYPES.find(d => d.id === typeId);
  if (!docType) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'gen-modal';

  // Load from dropdown selectors
  const hasCertLoad = existingCerts.length > 0 && docType.fields.some(f => ['holderName','recipientName'].includes(f));
  const hasEmpLoad = existingEmployees.length > 0 && docType.fields.some(f => ['holderName','recipientName'].includes(f));

  const certOptions = existingCerts.map(c =>
    `<option value="${esc(c._id)}">${esc(c.holderName)} — ${esc(c.certificateId)}</option>`
  ).join('');

  const empOptions = existingEmployees.map(e =>
    `<option value="${esc(e._id)}">${esc(e.name)} (${e.employeeType === 'intern' ? 'Intern' : 'Employee'})</option>`
  ).join('');

  overlay.innerHTML = `
<div class="modal-box" style="max-width:680px;">
  <div class="modal-header">
    <h2 class="modal-title">${docType.icon} ${docType.name}</h2>
    <button class="modal-close" onclick="document.getElementById('gen-modal').remove()">✕</button>
  </div>
  <div class="modal-body">
    
    ${hasEmpLoad ? `
    <div style="background:rgba(13,27,62,0.04);border:1px solid rgba(13,27,62,0.12);border-radius:8px;padding:12px 14px;margin-bottom:12px;display:flex;flex-direction:column;gap:6px;">
      <label class="form-label" style="font-weight:700;color:var(--navy);text-transform:uppercase;font-size:0.7rem;letter-spacing:0.5px;">👤 Autofill from Employee Directory</label>
      <select id="gen-emp-autofill" class="form-select">
        <option value="">— Select employee to auto-fill & calculate next ID —</option>
        ${empOptions}
      </select>
    </div>` : ''}

    ${hasCertLoad ? `
    <div style="background:rgba(13,27,62,0.04);border:1px solid rgba(13,27,62,0.12);border-radius:8px;padding:12px 14px;margin-bottom:18px;display:flex;flex-direction:column;gap:6px;">
      <label class="form-label" style="font-weight:700;color:var(--navy);text-transform:uppercase;font-size:0.7rem;letter-spacing:0.5px;">⚡ Autofill from Existing Certificate</label>
      <div style="display:flex;gap:8px;">
        <select id="cert-autofill" class="form-select" style="flex:1;">
          <option value="">— Select certificate —</option>
          ${certOptions}
        </select>
        <button class="btn-primary" onclick="window.wsAutoFill('${typeId}')" style="padding:8px 14px;font-size:0.8rem;">Fill</button>
      </div>
    </div>` : ''}

    <div class="form-grid" id="gen-form-fields">
      ${buildFormFields(docType)}
    </div>

    <!-- Recipient Security & Delivery (shared) -->
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-200);">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gray-400);margin-bottom:10px;">Recipient Security &amp; Delivery (For Secure Download Link)</div>
      <div class="form-grid">
        ${!docType.fields.includes('recipientEmail') ? `
        <div class="form-group">
          <label class="form-label">Recipient Email</label>
          <input id="f-recipientEmail" class="form-input" placeholder="email@example.com" />
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">Recipient Date of Birth</label>
          <input id="f-holderDob" class="form-input" type="date" />
        </div>
      </div>
    </div>

    <!-- Issuer fields (shared) -->
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-200);">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gray-400);margin-bottom:10px;">Authorised Signatory</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Issuer Name</label>
          <input id="f-issuerName" class="form-input" value="Mahender"/>
        </div>
        <div class="form-group">
          <label class="form-label">Issuer Title</label>
          <input id="f-issuerTitle" class="form-input" value="Founder, WaveSeed Co."/>
        </div>
      </div>
    </div>
    <p id="gen-error" style="color:var(--red);font-size:0.8rem;margin-top:10px;min-height:18px;"></p>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="document.getElementById('gen-modal').remove()">Cancel</button>
    <button class="btn-primary" id="btn-gen-doc" onclick="window.wsGenerate('${typeId}')">
      🖨️ Generate &amp; Preview
    </button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Set today's date as default for date fields
  const today = new Date().toISOString().split('T')[0];
  overlay.querySelectorAll('input[type="date"]').forEach(el => { if (!el.value) el.value = today; });

  // Helper to resolve prefix for Verification ID based on doc type and employee type
  function getPrefixForType(typeId, empType) {
    const map = {
      'internship-cert':   'WS-CERT-INT',
      'employment-cert':   'WS-CERT-EMP',
      'course-cert':       'WS-CERT-CRS',
      'appreciation-cert': 'WS-CERT-APR',
      'achievement-cert':  'WS-CERT-ACH',
      'volunteer-cert':    'WS-CERT-VOL',
      'internship-offer':  'WS-OFFER-INT',
      'employment-offer':  'WS-OFFER-EMP',
      'experience-letter': 'WS-EXP',
      'relieving-letter':  'WS-REL',
      'termination-letter':'WS-TERM',
      'lor':                'WS-LOR',
      'noc':                'WS-NOC',
      'promotion-letter':  'WS-PROM',
      'salary-revision':   'WS-SAL',
      'warning-letter':    'WS-WARN'
    };
    let prefix = map[typeId] || 'WS-DOC';
    if (typeId === 'internship-cert' && empType === 'employee') prefix = 'WS-CERT-EMP';
    if (typeId === 'employment-cert' && empType === 'intern') prefix = 'WS-CERT-INT';
    return prefix;
  }

  // Prefill next sequence IDs immediately on modal open
  (async () => {
    try {
      const certEl = document.getElementById('f-certId');
      const refEl = document.getElementById('f-refNum');
      if (certEl || refEl) {
        const nextIds = await adminGetNextIds(adminToken);
        const seqPart = nextIds.nextCertId.split('-').pop() || '0043';
        const refSeqPart = nextIds.nextRefNum.split('/').pop() || '043';
        
        if (certEl && !certEl.value) {
          const prefix = getPrefixForType(typeId);
          certEl.value = `${prefix}-2026-${seqPart}`;
        }
        if (refEl && !refEl.value) {
          const isEmp = typeId.includes('employment') || typeId.includes('salary') || typeId.includes('promotion');
          const refPrefix = isEmp ? 'WS/EMP' : 'WS/INT';
          refEl.value = `${refPrefix}/2026/AI-FS/${refSeqPart}`;
        }
      }
    } catch (e) {
      console.error("Failed to fetch next IDs:", e);
    }
  })();

  // Employee autofill change listener
  const empSelect = document.getElementById('gen-emp-autofill');
  if (empSelect) {
    empSelect.addEventListener('change', async () => {
      const val = empSelect.value;
      if (!val) return;
      const emp = existingEmployees.find(e => e._id === val);
      if (!emp) return;

      let empDob = '';
      try {
        if (emp.meta) {
          const meta = JSON.parse(emp.meta);
          if (meta.dob) empDob = meta.dob;
        }
      } catch {}

      const map = {
        'f-holderName':       emp.name,
        'f-recipientName':    emp.name,
        'f-recipientEmail':   emp.email,
        'f-recipientCollege': emp.institution,
        'f-recipientDept':    emp.department,
        'f-holderInstitution':emp.institution,
        'f-holderDepartment': emp.department,
        'f-role':             emp.role,
        'f-product':          emp.product,
        'f-workMode':         emp.workMode,
        'f-startDate':        emp.startDate,
        'f-endDate':          emp.endDate,
        'f-reportingTo':      emp.reportingTo,
        'f-holderDob':        empDob,
      };

      for (const [id, value] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
      }

      // If document needs ID and ref number, auto-increment them
      const certEl = document.getElementById('f-certId');
      const refEl = document.getElementById('f-refNum');
      if (certEl || refEl) {
        try {
          const nextIds = await adminGetNextIds(adminToken);
          const seqPart = nextIds.nextCertId.split('-').pop() || '0043';
          
          if (certEl) {
            const prefix = getPrefixForType(typeId, emp.employeeType);
            certEl.value = `${prefix}-2026-${seqPart}`;
          }
          if (refEl) {
            const refPrefix = emp.employeeType === 'intern' ? 'WS/INT' : 'WS/EMP';
            const refSeqPart = nextIds.nextRefNum.split('/').pop() || '043';
            refEl.value = `${refPrefix}/2026/AI-FS/${refSeqPart}`;
          }
        } catch { }
      }
      showToast('✅ Employee fields & next IDs prefilled!', 'success');
    });
  }
};

// ─── Auto-fill from certificate ────────────────────────────────────────────────
window.wsAutoFill = function(typeId) {
  const certId = document.getElementById('cert-autofill')?.value;
  if (!certId) return;
  const cert = existingCerts.find(c => c._id === certId);
  if (!cert) return;

  const map = {
    'f-certId':           cert.certificateId,
    'f-refNum':           cert.referenceNumber,
    'f-holderName':       cert.holderName,
    'f-recipientName':    cert.holderName,
    'f-recipientEmail':   cert.holderEmail,
    'f-recipientCollege': cert.holderInstitution,
    'f-recipientDept':    cert.holderDepartment,
    'f-holderInstitution':cert.holderInstitution,
    'f-holderDepartment': cert.holderDepartment,
    'f-role':             cert.role,
    'f-product':          cert.product,
    'f-workMode':         cert.workMode,
    'f-startDate':        cert.startDate,
    'f-endDate':          cert.endDate,
    'f-issuedDate':       cert.issuedDate,
    'f-reportingTo':      cert.reportingTo,
    'f-issuerName':       cert.issuerName,
    'f-issuerTitle':      cert.issuerTitle,
  };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  showToast('✅ Fields auto-filled from certificate!', 'success');
};

// ─── Generate & Print ──────────────────────────────────────────────────────────
window.wsGenerate = async function(typeId) {
  const docType = DOC_TYPES.find(d => d.id === typeId);
  const errEl = document.getElementById('gen-error');
  errEl.textContent = '';

  // Collect all field values
  const data = collectFormData(docType);

  // Validate required fields
  const missing = docType.fields.filter(fid => {
    const def = FIELD_DEF[fid];
    if (!def?.req) return false;
    const val = data[fid] || '';
    return !String(val).trim();
  });
  if (missing.length) {
    const labels = missing.map(f => FIELD_DEF[f]?.label || f).join(', ');
    errEl.textContent = `Required: ${labels}`;
    return;
  }

  const btn = document.getElementById('btn-gen-doc');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-right:8px;vertical-align:middle;"></div> Registering...`;

  try {
    // Save to database — include full templateData so the document can be re-rendered later
    await adminAddCertificate(adminToken, {
      certificateId:     data.certId || '',
      referenceNumber:   data.refNum || '',
      holderName:        data.holderName || data.recipientName || '',
      holderEmail:       data.recipientEmail || '',
      holderInstitution: data.holderInstitution || data.recipientCollege || '',
      holderDepartment:  data.holderDepartment || data.recipientDept || '',
      holderDob:         data.holderDob || undefined,
      certificateType:   typeId,
      role:              data.role || '',
      product:           data.product || '',
      reportingTo:       data.reportingTo || '',
      workMode:          data.workMode || '',
      issuedDate:        data.issuedDate || data.date || new Date().toISOString().split('T')[0],
      startDate:         data.startDate || '',
      endDate:           data.endDate || '',
      issuerName:        data.issuerName || 'Mahender',
      issuerTitle:       data.issuerTitle || 'Founder, WaveSeed Co.',
      notes:             `Generated via DocGen Dashboard: ${docType.name}`,
      templateData:      JSON.stringify(data),  // store ALL fields for future re-rendering
    });

    // Refresh existing certs list
    try {
      existingCerts = await adminGetAll(adminToken);
    } catch {}

    // Generate HTML
    const html = generateDocument(typeId, data);

    // Open print window
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.open();
    win.document.write(html);
    win.document.close();

    document.getElementById('gen-modal')?.remove();
    showToast('✅ Saved to Registry & document preview ready!', 'success');
  } catch (err) {
    console.error("Save error:", err);
    errEl.textContent = `Error saving to registry: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
};

// ─── Form Builder ──────────────────────────────────────────────────────────────
function buildFormFields(docType) {
  return docType.fields.map(fid => {
    const def = FIELD_DEF[fid];
    if (!def) return '';
    const inputId = `f-${fid}`;
    const req = def.req ? '<span class="req">*</span>' : '';
    const full = ['customMessage','responsibilities','reason','strengths','achievements','recommendation','incident'].includes(fid) ? ' form-full' : '';

    if (def.type === 'textarea') {
      return `
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  <textarea id="${inputId}" class="form-textarea" placeholder="${def.ph || ''}">${def.def || ''}</textarea>
</div>`;
    }
    if (def.type === 'select') {
      const opts = (def.opts || []).map((o, i) =>
        `<option value="${esc(o)}">${esc(def.optLabels?.[i] || o || '— Select —')}</option>`
      ).join('');
      return `
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  <select id="${inputId}" class="form-select">${opts}</select>
</div>`;
    }
    return `
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  <input id="${inputId}" class="form-input" type="${def.type || 'text'}" placeholder="${def.ph || ''}" value="${def.def || ''}"/>
</div>`;
  }).join('');
}

function collectFormData(docType) {
  const data = {};
  docType.fields.forEach(fid => {
    const el = document.getElementById(`f-${fid}`);
    data[fid] = el?.value?.trim() || '';
  });
  data.recipientEmail = document.getElementById('f-recipientEmail')?.value?.trim() || '';
  data.holderDob      = document.getElementById('f-holderDob')?.value?.trim() || '';
  data.issuerName  = document.getElementById('f-issuerName')?.value?.trim() || 'Mahender';
  data.issuerTitle = document.getElementById('f-issuerTitle')?.value?.trim() || 'Founder, WaveSeed Co.';
  data.certType    = docType.id.replace('-cert',''); // for certificate templates
  return data;
}

function camel(s) { return s.replace(/-([a-z])/g, g => g[1].toUpperCase()); }
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function showToast(msg, type='success') {
  const old = document.getElementById('ws-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'ws-toast';
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
