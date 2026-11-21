// ─── docTypes.js — the catalogue of documents the Create screen can issue ─────
// The RAW_ definitions (fields per document, field labels/types/defaults) are the proven
// ones from the original generator. Below them: icons, tones, grouping and ID prefixes
// for the redesigned Create experience.

const RAW_DOC_TYPES = [
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
    fields:['certId','refNum','date','recipientName','recipientCollege','recipientDept','recipientEmail','role','product','reportingTo','startDate','endDate','duration','workHours','workMode','workLocation','stipend','noticePeriod','offerValidity','responsibilities'],
  },
  {
    id:'employment-offer', cat:'letter', icon:'📋',
    name:'Employment Offer Letter', color:'#1e3264',
    desc:'Full-time employment offer with designation, CTC, and probation terms.',
    fields:['certId','refNum','date','recipientName','role','department','reportingTo','joiningDate','workMode','workLocation','ctc','probation','noticePeriod','noticeProbation','offerValidity'],
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

export const FIELD_DEF = {
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
  noticePeriod:    { label:'Notice Period',         ph:'e.g. 15 days (intern) / 60 days (employee)', def:'' },
  noticeProbation: { label:'Notice During Probation', ph:'30 days',               def:'30 days' },
  workLocation:    { label:'Place of Work', ph:'e.g. Hyderabad office / Remote' },
  offerValidity:   { label:'Offer valid until', type:'date' },
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

export const CATEGORIES = [
  { id: 'certificate', label: 'Certificates', icon: 'award' },
  { id: 'letter',      label: 'Letters',      icon: 'file-text' },
  { id: 'payroll',     label: 'Payroll',      icon: 'receipt' },
];

// Icon + colour tone per document (replaces the emoji used before)
const LOOK = {
  'internship-cert':    { icon: 'graduation-cap', tone: 'teal' },
  'employment-cert':    { icon: 'briefcase',      tone: 'violet' },
  'course-cert':        { icon: 'book',           tone: 'blue' },
  'appreciation-cert':  { icon: 'star',           tone: 'amber' },
  'achievement-cert':   { icon: 'award',          tone: 'gold' },
  'volunteer-cert':     { icon: 'party',          tone: 'rose' },
  'internship-offer':   { icon: 'file-text',      tone: 'teal' },
  'employment-offer':   { icon: 'file-check',     tone: 'violet' },
  'experience-letter':  { icon: 'file-text',      tone: 'navy' },
  'relieving-letter':   { icon: 'user-check',     tone: 'green' },
  'termination-letter': { icon: 'ban',            tone: 'rose' },
  'lor':                { icon: 'sparkles',       tone: 'gold' },
  'noc':                { icon: 'circle-check',   tone: 'blue' },
  'promotion-letter':   { icon: 'rocket',         tone: 'violet' },
  'salary-revision':    { icon: 'trending-up',    tone: 'teal' },
  'salary-slip':        { icon: 'receipt',        tone: 'teal' },
  'salary-certificate': { icon: 'bank',           tone: 'blue' },
  'warning-letter':     { icon: 'alert-triangle', tone: 'rose' },
};

// Descriptions written for any business (the originals named WaveSeed)
const DESC = {
  'internship-cert':   'Certificate for successfully completing an internship.',
  'course-cert':       'Certificate for completing a course, training or workshop.',
  'volunteer-cert':    'Certificate recognising volunteer contributions.',
};

export const DOC_TYPES = RAW_DOC_TYPES.map(d => ({ ...d, ...LOOK[d.id], desc: DESC[d.id] || d.desc }));
export const docType = (id) => DOC_TYPES.find(d => d.id === id) || null;

// How the form is laid out: fields are shown in these sections (only those the document uses)
export const FIELD_GROUPS = [
  { id: 'numbers',   title: 'Document numbers & dates', icon: 'fingerprint',
    fields: ['certId', 'refNum', 'date', 'issuedDate'] },
  { id: 'recipient', title: 'Recipient', icon: 'user',
    fields: ['holderName', 'recipientName', 'recipientEmail', 'holderInstitution', 'recipientCollege', 'holderDepartment', 'recipientDept', 'department', 'employeeCode', 'nameFont'] },
  { id: 'role',      title: 'Role & tenure', icon: 'briefcase',
    fields: ['role', 'oldRole', 'newRole', 'product', 'workMode', 'workLocation', 'reportingTo', 'startDate', 'endDate', 'currentlyWorking', 'joiningDate', 'relievingDate', 'terminationDate', 'effectiveDate', 'duration', 'workHours', 'probation', 'noticePeriod', 'noticeProbation', 'offerValidity'] },
  { id: 'pay',       title: 'Compensation', icon: 'receipt',
    fields: ['stipend', 'ctc', 'newCtc', 'oldSalary', 'newSalary', 'monthlyGross', 'monthlyNet', 'annualCtc', 'payslipType', 'payMonth', 'splitHelper', 'basicPay', 'hra', 'specialAllowance', 'conveyance', 'bonus', 'otherEarnings', 'pfDeduction', 'professionalTax', 'tds', 'lopDeduction', 'otherDeductions', 'pan', 'uan', 'bankName', 'bankAccount', 'paymentMode', 'paymentDate', 'workingDays', 'paidDays'] },
  { id: 'content',   title: 'Content', icon: 'pencil',
    fields: ['letterPurpose', 'purpose', 'responsibilities', 'conduct', 'strengths', 'achievements', 'recommendation', 'warningType', 'incident', 'responseDeadline', 'reason', 'finalSettlement', 'customMessage'] },
];

/** The form sections for one document type: [{ id, title, icon, fields: [fieldId…] }] */
export function sectionsFor(doc) {
  const used = new Set(doc.fields);
  const placed = new Set();
  const sections = FIELD_GROUPS.map(g => {
    const fields = g.fields.filter(f => used.has(f) && FIELD_DEF[f]);
    fields.forEach(f => placed.add(f));
    return { ...g, fields };
  }).filter(s => s.fields.length);
  const rest = doc.fields.filter(f => !placed.has(f) && FIELD_DEF[f]);
  if (rest.length) sections.push({ id: 'other', title: 'Other details', icon: 'sliders', fields: rest });
  return sections;
}

// Verification-ID prefix per document (the business code replaces the leading WS)
export const ID_PREFIX = {
  'internship-cert': 'WS-CERT-INT', 'employment-cert': 'WS-CERT-EMP', 'course-cert': 'WS-CERT-CRS',
  'appreciation-cert': 'WS-CERT-APR', 'achievement-cert': 'WS-CERT-ACH', 'volunteer-cert': 'WS-CERT-VOL',
  'internship-offer': 'WS-OFFER-INT', 'employment-offer': 'WS-OFFER-EMP', 'experience-letter': 'WS-EXP',
  'relieving-letter': 'WS-REL', 'termination-letter': 'WS-TERM', lor: 'WS-LOR', noc: 'WS-NOC',
  'promotion-letter': 'WS-PROM', 'salary-revision': 'WS-SAL', 'salary-slip': 'WS-PAY',
  'salary-certificate': 'WS-SALC', 'warning-letter': 'WS-WARN',
};
export function idPrefixFor(typeId, empType) {
  let p = ID_PREFIX[typeId] || 'WS-DOC';
  if (typeId === 'internship-cert' && empType === 'employee') p = 'WS-CERT-EMP';
  if (typeId === 'employment-cert' && empType === 'intern') p = 'WS-CERT-INT';
  return p;
}
