// ─── shared.js — Shared Page Components & Helpers ─────────────────────────────

export function productDropdownHTML(selectId, selectedValue = '') {
  const PRODUCT_OPTIONS = [
    'WaveBase AI', 'WaveSeed Verify', 'WaveSeed Platform',
    'AI Agent Suite', 'AI Automation Engine', 'AI Analytics Dashboard', 'AI Content Studio', 'AI Workflow Builder',
    'WaveSeed Mobile App', 'WaveSeed Admin App', 'Client Portal App',
    'Custom SaaS Product', 'Custom CRM System', 'Custom ERP System', 'Business Automation Tool',
    'Internal R&D Project', 'Client Project', 'Consulting Engagement'
  ];
  const isKnown = PRODUCT_OPTIONS.includes(selectedValue) || !selectedValue;
  
  return `
    <select id="${selectId}" class="form-select" onchange="document.getElementById('${selectId}-custom').style.display=this.value==='__custom__'?'block':'none'">
      <optgroup label="🌊 WaveSeed Flagship">
        <option value="WaveBase AI" ${selectedValue === 'WaveBase AI' ? 'selected' : ''}>WaveBase AI — AI-Powered Platform</option>
        <option value="WaveSeed Verify" ${selectedValue === 'WaveSeed Verify' ? 'selected' : ''}>WaveSeed Verify — Certificate System</option>
        <option value="WaveSeed Platform" ${selectedValue === 'WaveSeed Platform' ? 'selected' : ''}>WaveSeed Platform — Core Ecosystem</option>
      </optgroup>
      <optgroup label="🤖 AI Products">
        <option value="AI Agent Suite" ${selectedValue === 'AI Agent Suite' ? 'selected' : ''}>AI Agent Suite</option>
        <option value="AI Automation Engine" ${selectedValue === 'AI Automation Engine' ? 'selected' : ''}>AI Automation Engine</option>
        <option value="AI Analytics Dashboard" ${selectedValue === 'AI Analytics Dashboard' ? 'selected' : ''}>AI Analytics Dashboard</option>
        <option value="AI Content Studio" ${selectedValue === 'AI Content Studio' ? 'selected' : ''}>AI Content Studio</option>
        <option value="AI Workflow Builder" ${selectedValue === 'AI Workflow Builder' ? 'selected' : ''}>AI Workflow Builder</option>
      </optgroup>
      <optgroup label="📱 Apps">
        <option value="WaveSeed Mobile App" ${selectedValue === 'WaveSeed Mobile App' ? 'selected' : ''}>WaveSeed Mobile App</option>
        <option value="WaveSeed Admin App" ${selectedValue === 'WaveSeed Admin App' ? 'selected' : ''}>WaveSeed Admin App</option>
        <option value="Client Portal App" ${selectedValue === 'Client Portal App' ? 'selected' : ''}>Client Portal App</option>
      </optgroup>
      <optgroup label="⚙️ Custom Software">
        <option value="Custom SaaS Product" ${selectedValue === 'Custom SaaS Product' ? 'selected' : ''}>Custom SaaS Product</option>
        <option value="Custom CRM System" ${selectedValue === 'Custom CRM System' ? 'selected' : ''}>Custom CRM System</option>
        <option value="Custom ERP System" ${selectedValue === 'Custom ERP System' ? 'selected' : ''}>Custom ERP System</option>
        <option value="Business Automation Tool" ${selectedValue === 'Business Automation Tool' ? 'selected' : ''}>Business Automation Tool</option>
      </optgroup>
      <optgroup label="🔧 Services & R&D">
        <option value="Internal R&D Project" ${selectedValue === 'Internal R&D Project' ? 'selected' : ''}>Internal R&D Project</option>
        <option value="Client Project" ${selectedValue === 'Client Project' ? 'selected' : ''}>Client Project</option>
        <option value="Consulting Engagement" ${selectedValue === 'Consulting Engagement' ? 'selected' : ''}>Consulting Engagement</option>
      </optgroup>
      <option value="__custom__" ${!isKnown ? 'selected' : ''}>✏️ Other / Custom…</option>
    </select>
    <input id="${selectId}-custom" class="form-input" value="${!isKnown ? selectedValue : ''}" placeholder="Enter custom product/project name" style="margin-top:8px;display:${!isKnown ? 'block' : 'none'};" />
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
