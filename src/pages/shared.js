// ─── shared.js — Shared Page Components & Helpers ─────────────────────────────

/** HTML-escape for text and quoted attribute values. Never rely on this inside
 *  inline event handlers (entities are decoded before the JS runs) — pass ids only. */
export function escHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Only allow https links (e.g. uploaded signed copies); anything else → '' */
export function safeUrl(u) {
  try { return new URL(String(u)).protocol === 'https:' ? String(u) : ''; } catch { return ''; }
}

// Built-in WaveSeed list — used only when business settings could not be loaded.
const LEGACY_PRODUCTS = [
  'WaveBase AI', 'WaveSeed Verify', 'WaveSeed Platform',
  'AI Agent Suite', 'AI Automation Engine', 'AI Analytics Dashboard', 'AI Content Studio', 'AI Workflow Builder',
  'WaveSeed Mobile App', 'WaveSeed Admin App', 'Client Portal App',
  'Custom SaaS Product', 'Custom CRM System', 'Custom ERP System', 'Business Automation Tool',
  'Internal R&D Project', 'Client Project', 'Consulting Engagement',
];

/**
 * <option> list for a product select.
 * products = the business's list from Settings, or null to use the built-in list.
 */
export function productOptionsHTML(products, selectedValue = '') {
  const list = Array.isArray(products) ? products : LEGACY_PRODUCTS;
  const known = !selectedValue || list.includes(selectedValue);
  return '<option value="">— Select —</option>' +
    list.map(p => `<option value="${escHTML(p)}" ${p === selectedValue ? 'selected' : ''}>${escHTML(p)}</option>`).join('') +
    `<option value="__custom__" ${!known ? 'selected' : ''}>✏️ Other / Custom…</option>`;
}

export function productDropdownHTML(selectId, selectedValue = '', products = null) {
  const list = Array.isArray(products) ? products : LEGACY_PRODUCTS;
  const isKnown = list.includes(selectedValue) || !selectedValue;
  return `
    <select id="${selectId}" class="form-select" onchange="document.getElementById('${selectId}-custom').style.display=this.value==='__custom__'?'block':'none'">
      ${productOptionsHTML(products, selectedValue)}
    </select>
    <input id="${selectId}-custom" class="form-input" value="${!isKnown ? escHTML(selectedValue) : ''}" placeholder="Enter custom product/project name" style="margin-top:8px;display:${!isKnown ? 'block' : 'none'};" />
  `;
}

// Common reasons an employee requests an experience / service letter
export const LETTER_PURPOSE_GROUPS = [
  ['🎓 Education', ['Higher Education / Further Studies', 'University / College Admission', 'Education Loan Application', 'Scholarship Application', 'Professional Certification / Licensing']],
  ['✈️ Travel & Immigration', ['Visa Application', 'Immigration / Permanent Residency', 'Passport Application']],
  ['🏦 Financial & Housing', ['Bank Loan Application', 'Bank Account / KYC', 'Credit Card Application', 'Rental / Lease Agreement', 'Address Proof']],
  ['💼 Employment', ['Background Verification', 'Employment Verification', 'Future Employment']],
];

export function purposeDropdownHTML(selectId, selectedValue = '') {
  const known = LETTER_PURPOSE_GROUPS.flatMap(([, opts]) => opts);
  const isKnown = known.includes(selectedValue) || !selectedValue;
  const groups = LETTER_PURPOSE_GROUPS.map(([label, opts]) => `
      <optgroup label="${label}">
        ${opts.map(o => `<option value="${o}" ${selectedValue === o ? 'selected' : ''}>${o}</option>`).join('')}
      </optgroup>`).join('');
  return `
    <select id="${selectId}" class="form-select" onchange="document.getElementById('${selectId}-custom').style.display=this.value==='__custom__'?'block':'none'">
      <option value="" ${!selectedValue ? 'selected' : ''}>— General (personal records / official use) —</option>
      ${groups}
      <option value="__custom__" ${!isKnown ? 'selected' : ''}>✏️ Other / Custom…</option>
    </select>
    <input id="${selectId}-custom" class="form-input" value="${!isKnown ? escHTML(selectedValue) : ''}" placeholder="e.g. Admission to M.S. program at XYZ University" style="margin-top:8px;display:${!isKnown ? 'block' : 'none'};" />
  `;
}

export function tableSkeletonHTML(cols = 8, rows = 5) {
  let output = '';
  for (let r = 0; r < rows; r++) {
    output += '<tr>';
    for (let c = 0; c < cols; c++) {
      output += `<td><div class="skeleton-line" style="width: ${30 + Math.random() * 60}%"></div></td>`;
    }
    output += '</tr>';
  }
  return output;
}
