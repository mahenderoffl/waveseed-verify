// ─── generate.js — Document Generation Dashboard ──────────────────────────────
import { generateDocument, payslipTotals, inr, brandSnapshot } from '../templates/templates.js';
import { adminGetAll, adminGetEmployees, adminGetNextIds, adminAddCertificate, adminGetBusinesses } from '../api.js';
import { productDropdownHTML, productOptionsHTML, purposeDropdownHTML } from './shared.js';
import { productsByCode } from '../utils/businesses.js';

// ─── Document Type Catalogue ───────────────────────────────────────────────────
const DOC_TYPES = [
  // ── Certificates ─────────────────────────────────────────────────────────────
  {
    id:'internship-cert', cat:'certificate', icon:'🎓',
    name:'Internship Completion', color:'#0d1b3e',
    desc:'Certificate for successfully completing an internship at WaveSeed Co.',
    fields:['certId','refNum','holderName','nameFont','holderInstitution','holderDepartment','role','product','workMode','startDate','endDate','issuedDate','customMessage'],
  },
  {
    id:'employment-cert', cat:'certificate', icon:'💼',
    name:'Employment Certificate', color:'#1e3264',
    desc:'Proof of employment / service certificate for current or former employees.',
    fields:['certId','refNum','holderName','nameFont','role','startDate','endDate','currentlyWorking','issuedDate','customMessage'],
  },
  {
    id:'course-cert', cat:'certificate', icon:'📚',
    name:'Course Completion', color:'#7c3aed',
    desc:'Certificate for completing a course, training, or workshop at WaveSeed.',
    fields:['certId','refNum','holderName','nameFont','holderInstitution','role','product','startDate','endDate','issuedDate','customMessage'],
  },
  {
    id:'appreciation-cert', cat:'certificate', icon:'⭐',
    name:'Appreciation Certificate', color:'#c9a227',
    desc:'Certificate of appreciation for outstanding contributions and dedication.',
    fields:['certId','refNum','holderName','nameFont','holderInstitution','role','issuedDate','customMessage'],
  },
  {
    id:'achievement-cert', cat:'certificate', icon:'🏆',
    name:'Excellence / Achievement', color:'#059669',
    desc:'Certificate of excellence for top-performing interns or employees.',
    fields:['certId','refNum','holderName','nameFont','holderInstitution','role','issuedDate','customMessage'],
  },
  {
    id:'volunteer-cert', cat:'certificate', icon:'🤲',
    name:'Volunteer Recognition', color:'#0891b2',
    desc:'Certificate recognising volunteer contributions to WaveSeed projects.',
    fields:['certId','refNum','holderName','nameFont','holderInstitution','role','startDate','endDate','issuedDate','customMessage'],
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
    desc:'Service verification letter confirming tenure and role for current or former employees.',
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','currentlyWorking','letterPurpose','responsibilities','conduct'],
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
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','currentlyWorking','strengths','achievements','recommendation'],
  },
  {
    id:'noc', cat:'letter', icon:'✅',
    name:'No Objection Certificate', color:'#0891b2',
    desc:'NOC for further studies, visa applications, or external opportunities.',
    fields:['certId','refNum','date','recipientName','role','startDate','endDate','currentlyWorking','purpose'],
  },
  {
    id:'promotion-letter', cat:'letter', icon:'🚀',
    name:'Promotion Letter', color:'#7c3aed',
    desc:'Formal promotion confirmation with new designation and revised CTC.',
    fields:['certId','refNum','date','recipientName','oldRole','newRole','effectiveDate','reportingTo','newCtc'],
  },
  {
    id:'salary-revision', cat:'payroll', icon:'💰',
    name:'Salary Revision Letter', color:'#0d9488',
    desc:'Letter confirming salary increment or revision.',
    fields:['certId','refNum','date','recipientName','role','oldSalary','newSalary','effectiveDate'],
  },
  {
    id:'salary-slip', cat:'payroll', icon:'🧾',
    name:'Salary / Stipend Slip', color:'#0f766e',
    desc:'Monthly payslip with earnings, deductions and net pay in words — for employees or interns.',
    fields:['certId','refNum','date','recipientName','payslipType','payMonth','employeeCode','role','department','joiningDate','pan','uan','bankName','bankAccount','paymentMode','paymentDate','workingDays','paidDays','splitHelper','basicPay','hra','specialAllowance','conveyance','bonus','otherEarnings','pfDeduction','professionalTax','tds','lopDeduction','otherDeductions'],
  },
  {
    id:'salary-certificate', cat:'payroll', icon:'🏦',
    name:'Salary Certificate', color:'#1d4ed8',
    desc:'Certifies current employment and salary — for bank loans, visas, rentals and similar.',
    fields:['certId','refNum','date','recipientName','role','department','joiningDate','monthlyGross','monthlyNet','annualCtc','letterPurpose'],
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
  nameFont:        { label:'Holder Name Font Style',  type:'select', opts:['cursive','serif','modern'], optLabels:['Cursive Script (Great Vibes)','Premium Serif (Playfair Display)','Elegant Calligraphy (Dancing Script)'], def:'cursive' },
  holderInstitution:{ label:'Institution / Organization', ph:'College or Company' },
  holderDepartment:{ label:'Department / Branch',   ph:'e.g. AI & ML (CSM)' },
  role:            { label:'Role / Designation',    ph:'e.g. AI Full Stack Developer Intern', req:true },
  product:         { label:'Project / Product',     ph:'e.g. WaveBase AI',        def:'WaveBase AI' },
  workMode:        { label:'Work Mode',             type:'select', opts:['','Remote','On-site','Hybrid'] },
  startDate:       { label:'Start Date',            type:'date' },
  endDate:         { label:'End Date',              type:'date' },
  currentlyWorking:{ label:'Currently working here (no end date — reads "since … till date")', type:'checkbox' },
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
  letterPurpose:   { label:'Purpose of Letter' },
  // Payroll
  payslipType:     { label:'Slip Type', type:'select', opts:['Salary Slip','Stipend Slip'] },
  payMonth:        { label:'Pay Month', type:'month', req:true },
  employeeCode:    { label:'Employee / Intern ID', ph:'e.g. WS-EMP-012' },
  pan:             { label:'PAN', ph:'ABCDE1234F' },
  uan:             { label:'UAN (PF)', ph:'Universal Account Number' },
  bankName:        { label:'Bank Name', ph:'e.g. State Bank of India' },
  bankAccount:     { label:'Bank Account No.', ph:'Only the last 4 digits are printed' },
  paymentMode:     { label:'Payment Mode', type:'select', opts:['Bank Transfer','UPI','Cheque','Cash'] },
  paymentDate:     { label:'Payment Date', type:'date' },
  workingDays:     { label:'Working Days', type:'number', def:'30' },
  paidDays:        { label:'Paid Days', type:'number', def:'30' },
  splitHelper:     { label:'Quick fill from monthly gross (optional)' },
  basicPay:        { label:'Basic Pay / Stipend (₹)', type:'amount', grp:'earn' },
  hra:             { label:'House Rent Allowance (₹)', type:'amount', grp:'earn' },
  specialAllowance:{ label:'Special Allowance (₹)', type:'amount', grp:'earn' },
  conveyance:      { label:'Conveyance Allowance (₹)', type:'amount', grp:'earn' },
  bonus:           { label:'Bonus / Incentive (₹)', type:'amount', grp:'earn' },
  otherEarnings:   { label:'Other Earnings (₹)', type:'amount', grp:'earn' },
  pfDeduction:     { label:'Provident Fund (₹)', type:'amount', grp:'ded' },
  professionalTax: { label:'Professional Tax (₹)', type:'amount', grp:'ded' },
  tds:             { label:'Income Tax / TDS (₹)', type:'amount', grp:'ded' },
  lopDeduction:    { label:'Loss of Pay (₹)', type:'amount', grp:'ded' },
  otherDeductions: { label:'Other Deductions (₹)', type:'amount', grp:'ded' },
  monthlyGross:    { label:'Monthly Gross Salary (₹)', type:'amount' },
  monthlyNet:      { label:'Monthly Net / Take-home (₹)', type:'amount' },
  annualCtc:       { label:'Annual CTC (₹)', type:'amount' },
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
let businessesList = [];          // from Settings (with resolved branding)
let currentBizCode = 'WS';        // business the document is being issued for

const bizCode = () => currentBizCode || 'WS';
const idPrefix = base => base.replace(/^WS(?=-)/, bizCode());          // WS-CERT-INT -> WSG-CERT-INT
// WaveSeed keeps its historical AI-FS reference format; other businesses use CODE/KIND/YEAR/NNN
const makeRef = (kind, seq) => bizCode() === 'WS'
  ? `WS/${kind}/${new Date().getFullYear()}/AI-FS/${seq}`
  : `${bizCode()}/${kind}/${new Date().getFullYear()}/${seq}`;
const defaultBizCode = () => (businessesList.find(b => !b.parentId) || {}).code || 'WS';

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
  try { businessesList = (await adminGetBusinesses(token)).businesses || []; } catch { businessesList = []; }
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
    <button class="gen-tab" data-cat="payroll">💰 Payroll</button>
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
  <div class="doc-card-cat">${doc.cat === 'certificate' ? '🎓 Certificate' : doc.cat === 'payroll' ? '💰 Payroll' : '📝 Letter'}</div>
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

  currentBizCode = defaultBizCode();
  const activeBiz = businessesList.filter(b => b.active);
  const bizSelectHTML = activeBiz.length > 1 ? `
    <div style="background:rgba(201,162,39,0.08);border:1px solid rgba(201,162,39,0.35);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
      <label class="form-label" style="font-weight:700;color:var(--navy);text-transform:uppercase;font-size:0.7rem;letter-spacing:0.5px;">🏢 Issuing business (letterhead, signatory &amp; ID prefix)</label>
      <select id="gen-business" class="form-select">
        ${activeBiz.map(b => `<option value="${esc(b.code)}" ${b.code === currentBizCode ? 'selected' : ''}>${esc(b.displayName)} (${esc(b.code)})</option>`).join('')}
      </select>
    </div>` : '';

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
    
    ${bizSelectHTML}
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

  document.getElementById('gen-business')?.addEventListener('change', async (ev) => {
    currentBizCode = ev.target.value;
    const prodSel = document.getElementById('f-product');
    if (prodSel) {
      const keep = prodSel.value;
      prodSel.innerHTML = productOptionsHTML(productsByCode(businessesList, bizCode()), keep);
      const custom = document.getElementById('f-product-custom');
      if (custom) custom.style.display = prodSel.value === '__custom__' ? 'block' : 'none';
    }
    const certEl = document.getElementById('f-certId');
    const refEl = document.getElementById('f-refNum');
    if (!certEl && !refEl) return;
    try {
      const next = await adminGetNextIds(adminToken, bizCode());
      const seq = next.nextCertId.split('-').pop();
      const refSeq = next.nextRefNum.split('/').pop();
      const isEmp = typeId.includes('employment') || typeId.includes('salary') || typeId.includes('promotion');
      if (certEl) certEl.value = `${idPrefix(getPrefixForType(typeId))}-${new Date().getFullYear()}-${seq}`;
      if (refEl) refEl.value = makeRef(isEmp ? 'EMP' : 'INT', refSeq);
    } catch { /* leave fields as they are */ }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  attachPayslipTotals();

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
      'salary-slip':       'WS-PAY',
      'salary-certificate':'WS-SALC',
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
        const nextIds = await adminGetNextIds(adminToken, bizCode());
        const seqPart = nextIds.nextCertId.split('-').pop() || '0043';
        const refSeqPart = nextIds.nextRefNum.split('/').pop() || '043';
        
        if (certEl && !certEl.value) {
          const prefix = getPrefixForType(typeId);
          certEl.value = `${idPrefix(prefix)}-${new Date().getFullYear()}-${seqPart}`;
        }
        if (refEl && !refEl.value) {
          const isEmp = typeId.includes('employment') || typeId.includes('salary') || typeId.includes('promotion');
          refEl.value = makeRef(isEmp ? 'EMP' : 'INT', refSeqPart);
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
      const empBiz = businessesList.find(b => b.id === emp.businessId);
      if (empBiz) {
        currentBizCode = empBiz.code;
        const bizSel = document.getElementById('gen-business');
        if (bizSel) bizSel.value = empBiz.code;
      }

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
        'f-joiningDate':      emp.startDate,
        'f-department':       emp.department,
        'f-holderDob':        empDob,
        'f-employeeCode':     emp.empCode,
      };

      for (const [id, value] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
      }
      // Active employee with no end date → still serving
      window.wsToggleOngoing(emp.status !== 'former' && !emp.endDate);

      // If document needs ID and ref number, auto-increment them
      const certEl = document.getElementById('f-certId');
      const refEl = document.getElementById('f-refNum');
      if (certEl || refEl) {
        try {
          const nextIds = await adminGetNextIds(adminToken, bizCode());
          const seqPart = nextIds.nextCertId.split('-').pop() || '0043';
          
          if (certEl) {
            const prefix = getPrefixForType(typeId, emp.employeeType);
            certEl.value = `${idPrefix(prefix)}-${new Date().getFullYear()}-${seqPart}`;
          }
          if (refEl) {
            const refSeqPart = nextIds.nextRefNum.split('/').pop() || '043';
            refEl.value = makeRef(emp.employeeType === 'intern' ? 'INT' : 'EMP', refSeqPart);
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
    'f-department':       cert.holderDepartment,
    'f-issuerName':       cert.issuerName,
    'f-issuerTitle':      cert.issuerTitle,
  };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  let ongoing = false;
  try { ongoing = JSON.parse(cert.templateData || '{}').currentlyWorking === 'yes' && !cert.endDate; } catch {}
  window.wsToggleOngoing(ongoing);
  showToast('✅ Fields auto-filled from certificate!', 'success');
};

// ─── Generate & Print ──────────────────────────────────────────────────────────
window.wsGenerate = async function(typeId) {
  const docType = DOC_TYPES.find(d => d.id === typeId);
  const errEl = document.getElementById('gen-error');
  errEl.textContent = '';

  // Collect all field values
  const data = collectFormData(docType);
  const issuingBiz = businessesList.find(b => b.code === bizCode());
  data.brand = brandSnapshot(issuingBiz);   // stored with the document so it re-renders exactly as issued
  const selectedEmp = existingEmployees.find(e => e._id === document.getElementById('gen-emp-autofill')?.value);
  if (selectedEmp && selectedEmp.empCode) data.empCode = selectedEmp.empCode;   // printed on letters

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
  const payrollError = validatePayroll(typeId, data);
  if (payrollError) { errEl.textContent = payrollError; return; }

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
      issuerName:        data.issuerName || data.brand?.sigName || 'Mahender',
      issuerTitle:       data.issuerTitle || (data.brand?.sigTitle ? `${data.brand.sigTitle}, ${data.brand.legal || data.brand.name}` : 'Founder, WaveSeed Co.'),
      notes:             `Generated via DocGen Dashboard: ${docType.name}${data.payMonth ? ` (${data.payMonth})` : ''}`,
      nameFont:          data.nameFont || 'cursive',
      templateData:      JSON.stringify(data),  // store ALL fields for future re-rendering
      employeeId:        document.getElementById('gen-emp-autofill')?.value || undefined,
      businessId:        issuingBiz?.id,
    });

    // Refresh existing certs list
    try {
      existingCerts = await adminGetAll(adminToken);
    } catch {}

    // Generate HTML
    const html = generateDocument(typeId, data);

    // Open print window
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      showToast('⚠️ Saved to Registry, but preview popup was blocked. Please allow popups.', 'warning');
    }

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

// ─── Payroll helpers ───────────────────────────────────────────────────────────
function validatePayroll(typeId, data) {
  if (typeId === 'salary-slip') {
    const { gross, net } = payslipTotals(data);
    if (gross <= 0) return 'Enter at least one earning amount.';
    if (net < 0) return 'Total deductions exceed gross earnings — please check the amounts.';
    const wd = parseFloat(data.workingDays), pd = parseFloat(data.paidDays);
    if (data.workingDays && (!(wd > 0) || wd > 31)) return 'Working days must be between 1 and 31.';
    if (data.paidDays && (pd < 0 || (wd > 0 && pd > wd))) return 'Paid days cannot exceed working days.';
    if (data.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(data.pan)) return 'PAN should look like ABCDE1234F.';
    // One active slip per person per month
    const name = (data.recipientName || '').trim().toLowerCase();
    const dup = existingCerts.find(c => {
      if (c.certificateType !== 'salary-slip' || c.status === 'revoked') return false;
      if ((c.holderName || '').trim().toLowerCase() !== name) return false;
      try { return JSON.parse(c.templateData || '{}').payMonth === data.payMonth; } catch { return false; }
    });
    if (dup) return `A slip for ${data.recipientName} for ${data.payMonth} already exists (${dup.certificateId}). Revoke it first or choose another month.`;
  }
  if (typeId === 'salary-certificate') {
    if (!data.monthlyGross && !data.annualCtc) return 'Enter the monthly gross salary or the annual CTC.';
  }
  return '';
}

/** Live Gross / Deductions / Net panel under the payslip form */
function attachPayslipTotals() {
  const host = document.getElementById('gen-form-fields');
  if (!host || !document.getElementById('f-basicPay')) return;
  const panel = document.createElement('div');
  panel.className = 'form-group form-full';
  panel.id = 'payslip-totals';
  panel.style.cssText = 'background:#0d1b3e;color:#fff;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:0.82rem;';
  host.appendChild(panel);
  const update = () => {
    const vals = {};
    host.querySelectorAll('input[data-pay]').forEach(el => { vals[el.id.slice(2)] = el.value; });
    const t = payslipTotals(vals);
    panel.innerHTML = `<span>Gross: <strong>${inr(t.gross)}</strong></span><span>Deductions: <strong>${inr(t.deductions)}</strong></span>`
      + `<span>Net Pay: <strong style="color:${t.net < 0 ? '#fca5a5' : '#f0d078'};">${inr(t.net)}</strong></span>`;
  };
  host.addEventListener('input', e => { if (e.target.matches('input[data-pay]')) update(); });
  update();
}

window.wsSplitGross = function() {
  const g = parseFloat(document.getElementById('f-splitGross')?.value);
  if (!(g > 0)) return showToast('Enter a monthly gross amount first', 'error');
  const set = (id, v) => { const el = document.getElementById(`f-${id}`); if (el) el.value = v ? v.toFixed(2) : ''; };
  const stipend = document.getElementById('f-payslipType')?.value === 'Stipend Slip';
  if (stipend) {
    set('basicPay', g); ['hra','specialAllowance','conveyance','pfDeduction','professionalTax'].forEach(k => set(k, 0));
  } else {
    const basic = Math.round(g * 0.5), hra = Math.round(basic * 0.4);
    set('basicPay', basic); set('hra', hra); set('specialAllowance', g - basic - hra); set('conveyance', 0);
    set('pfDeduction', Math.min(Math.round(basic * 0.12), 1800));
    set('professionalTax', g >= 15000 ? 200 : 0);
  }
  document.getElementById('f-basicPay')?.dispatchEvent(new Event('input', { bubbles: true }));
};

// ─── Ongoing tenure toggle ─────────────────────────────────────────────────────
// When "Currently working here" is ticked, the End Date is cleared and disabled
// so the letter renders "since <start> … as on <letter date>" instead of a range.
window.wsToggleOngoing = function(force) {
  const chk = document.getElementById('f-currentlyWorking');
  const end = document.getElementById('f-endDate');
  if (!chk || !end) return;
  if (typeof force === 'boolean') chk.checked = force;
  end.disabled = chk.checked;
  if (chk.checked) end.value = '';
};

// ─── Form Builder ──────────────────────────────────────────────────────────────
function buildFormFields(docType) {
  return docType.fields.map(fid => {
    const def = FIELD_DEF[fid];
    if (!def) return '';
    const inputId = `f-${fid}`;
    const req = def.req ? '<span class="req">*</span>' : '';
    const full = ['customMessage','responsibilities','reason','strengths','achievements','recommendation','incident'].includes(fid) ? ' form-full' : '';

    if (fid === 'splitHelper') {
      return `
<div class="form-group form-full" style="background:rgba(15,118,110,0.06);border:1px dashed rgba(15,118,110,0.35);border-radius:8px;padding:10px 12px;">
  <label class="form-label">${def.label}</label>
  <div style="display:flex;gap:8px;">
    <input id="f-splitGross" class="form-input" type="number" min="0" step="0.01" placeholder="Monthly gross, e.g. 30000" style="flex:1;" />
    <button type="button" class="btn-secondary" onclick="window.wsSplitGross()" style="white-space:nowrap;">⚡ Suggest split</button>
  </div>
  <div style="font-size:0.72rem;color:var(--gray-400);margin-top:6px;">Fills Basic 50%, HRA 40% of Basic, rest as Special Allowance, PF 12% of Basic (max ₹1,800) and PT ₹200 if gross ≥ ₹15,000. Suggestions only — review before generating. Stipend slips put the full amount as Stipend.</div>
</div>`;
    }
    if (def.type === 'amount') {
      const head = fid === 'basicPay' ? '<div class="form-group form-full" style="margin-bottom:-6px;"><div style="font-size:0.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#059669;">Earnings</div></div>'
                 : fid === 'pfDeduction' ? '<div class="form-group form-full" style="margin-bottom:-6px;"><div style="font-size:0.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#dc2626;">Deductions</div></div>' : '';
      return `${head}
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  <input id="${inputId}" class="form-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" ${def.grp ? 'data-pay="1"' : ''}/>
</div>`;
    }

    if (fid === 'letterPurpose') {
      return `
<div class="form-group${full}">
  <label class="form-label">${def.label}</label>
  ${purposeDropdownHTML(inputId)}
</div>`;
    }

    if (fid === 'product') {
      return `
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  ${productDropdownHTML(inputId, bizCode() === 'WS' ? (def.def || '') : '', productsByCode(businessesList, bizCode()))}
</div>`;
    }

    if (def.type === 'textarea') {
      return `
<div class="form-group${full}">
  <label class="form-label">${def.label} ${req}</label>
  <textarea id="${inputId}" class="form-textarea" placeholder="${def.ph || ''}">${def.def || ''}</textarea>
</div>`;
    }
    if (def.type === 'checkbox') {
      return `
<div class="form-group form-full">
  <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;">
    <input id="${inputId}" type="checkbox" onchange="window.wsToggleOngoing()" /> ${def.label}
  </label>
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
    if (fid === 'splitHelper') return; // UI-only helper
    if (fid === 'product' || fid === 'letterPurpose') {
      const selectVal = document.getElementById(`f-${fid}`)?.value || '';
      data[fid] = selectVal === '__custom__'
        ? (document.getElementById(`f-${fid}-custom`)?.value?.trim() || '')
        : selectVal;
    } else if (FIELD_DEF[fid]?.type === 'checkbox') {
      data[fid] = document.getElementById(`f-${fid}`)?.checked ? 'yes' : '';
    } else {
      const el = document.getElementById(`f-${fid}`);
      data[fid] = el?.value?.trim() || '';
    }
  });
  data.recipientEmail = document.getElementById('f-recipientEmail')?.value?.trim() || '';
  data.holderDob      = document.getElementById('f-holderDob')?.value?.trim() || '';
  data.issuerName  = document.getElementById('f-issuerName')?.value?.trim() || 'Mahender';
  data.issuerTitle = document.getElementById('f-issuerTitle')?.value?.trim() || 'Founder, WaveSeed Co.';
  data.certType    = docType.id.replace('-cert',''); // for certificate templates
  if (data.currentlyWorking) data.endDate = ''; // ongoing tenure has no end date
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
  t.innerHTML = `<span></span>`;
  t.firstElementChild.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
