// ─── docCatalog.js — single source of truth for collectable documents ─────────
// Keep the `type` keys in sync with ALLOWED_DOC_TYPES in convex/http.ts.
// `kb` = client-side compression target for images.

export const DOC_TYPES = {
  // Identity
  govt_id:    { group: 'identity',  icon: '🪪', label: 'Government Photo ID',          hint: 'Aadhaar / Passport / Voter ID / Driving Licence', kb: 300 },
  pan:        { group: 'identity',  icon: '🪪', label: 'PAN Card',                     hint: 'PAN card scan / photo',                            kb: 200 },
  photo:      { group: 'identity',  icon: '🖼️', label: 'Passport-size Photo',          hint: 'Clear face photo on a plain background',           kb: 100 },
  bank:       { group: 'identity',  icon: '🏦', label: 'Bank Account Proof',           hint: 'Cancelled cheque / Passbook front page',           kb: 300 },
  college_id: { group: 'identity',  icon: '🎓', label: 'College / Institute ID Card',  hint: 'Your current student ID',                          kb: 200 },
  // Education
  tenth:      { group: 'education', icon: '📄', label: '10th (SSC) Marksheet / Certificate',   hint: 'Class 10 board marksheet or certificate',   kb: 400 },
  twelfth:    { group: 'education', icon: '📄', label: '12th (HSC / Intermediate) Marksheet',  hint: 'Class 12 board marksheet or certificate',   kb: 400 },
  iti_diploma:{ group: 'education', icon: '🛠️', label: 'ITI / Diploma Certificate',    hint: 'ITI trade certificate or Diploma + marksheets',    kb: 400 },
  graduation: { group: 'education', icon: '🎓', label: 'Graduation Degree (UG)',       hint: 'Degree certificate / provisional + final marksheet', kb: 400 },
  postgrad:   { group: 'education', icon: '🎓', label: 'Post-Graduation Degree (PG)',  hint: 'Master\'s degree certificate / marksheet',         kb: 400 },
  dual_degree:{ group: 'education', icon: '🎓', label: 'Dual / Second Degree',         hint: 'Any additional or dual-degree certificate',        kb: 400 },
  other_cert: { group: 'education', icon: '🏅', label: 'Other Certification',          hint: 'Professional course or skill certificate',         kb: 400 },
  marksheet:  { group: 'education', icon: '📄', label: 'Latest Semester Marksheet',    hint: 'Most recent mark sheet / transcript',              kb: 400 },
  degree:     { group: 'education', icon: '📜', label: 'Highest Degree Certificate',   hint: 'Highest qualification',                            kb: 400 },
  // Work
  experience: { group: 'work',      icon: '💼', label: 'Experience Letter',            hint: 'From a previous employer',                         kb: 400 },
  relieving:  { group: 'work',      icon: '💼', label: 'Relieving Letter',             hint: 'From your last employer',                          kb: 400 },
  payslip:    { group: 'work',      icon: '💼', label: 'Last Payslip',                 hint: 'Most recent salary slip',                          kb: 300 },
};

export const GROUPS = [
  { id: 'identity',  title: '🪪 Identity & Bank' },
  { id: 'education', title: '🎓 Education Certificates' },
  { id: 'work',      title: '💼 Work History' },
];

// Which documents each person is asked for.
//  required — must be uploaded.
//  oneOf    — "at least one of these" groups (e.g. highest qualification).
// To change what is mandatory, edit only these two objects.
const INTERN = {
  required: ['govt_id', 'photo', 'college_id', 'tenth', 'twelfth'],
  oneOf:    {},
  optional: ['bank', 'marksheet', 'iti_diploma', 'graduation', 'postgrad', 'dual_degree', 'other_cert'],
};
const EMPLOYEE = {
  required: ['govt_id', 'pan', 'photo', 'tenth', 'twelfth'],
  oneOf:    { highest: ['graduation', 'iti_diploma', 'postgrad'] },
  optional: ['bank', 'dual_degree', 'other_cert', 'experience', 'relieving', 'payslip'],
};

export const ONE_OF_LABELS = {
  highest: 'Highest qualification (at least one of: Graduation, ITI/Diploma, Post-Graduation)',
};

export function slotsFor(personType) {
  const cfg = personType === 'employee' ? EMPLOYEE : INTERN;
  const grouped = new Map();
  for (const [g, types] of Object.entries(cfg.oneOf)) types.forEach(t => grouped.set(t, g));
  const all = [
    ...cfg.required.map(t => ({ type: t, required: true })),
    ...[...grouped.keys()].map(t => ({ type: t, required: false, oneOf: grouped.get(t) })),
    ...cfg.optional.map(t => ({ type: t, required: false })),
  ];
  return all.map(s => ({ ...s, ...DOC_TYPES[s.type] }));
}

// Counts requirement "units": each required doc is one unit, each oneOf group is one unit.
// hasType(type) -> boolean. Returns { done, total, missing: [labels] }.
export function requirementProgress(slots, hasType) {
  let done = 0, total = 0;
  const missing = [];
  for (const s of slots.filter(s => s.required)) {
    total++;
    if (hasType(s.type)) done++; else missing.push(s.label);
  }
  for (const g of [...new Set(slots.filter(s => s.oneOf).map(s => s.oneOf))]) {
    total++;
    if (slots.filter(s => s.oneOf === g).some(s => hasType(s.type))) done++;
    else missing.push(ONE_OF_LABELS[g] || g);
  }
  return { done, total, missing };
}
