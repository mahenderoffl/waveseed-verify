// ─── api.js — All Convex HTTP calls ──────────────────────────────────────────
const HTTP_URL = 'https://enchanted-hamster-869.convex.site';

// ── Public Verification ────────────────────────────────────────────────────────
export async function verifyCertificate({ id, ref }) {
  const params = new URLSearchParams();
  if (id)  params.set('id', id);
  if (ref) params.set('ref', ref);
  const res = await fetch(`${HTTP_URL}/verify?${params}`);
  return res.json();
}

// ── Public Secure Download (ref/certId + DOB) ──────────────────────────────────
export async function publicDownload({ ref, certId, dob }) {
  const res = await fetch(`${HTTP_URL}/public/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, certId, dob }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Authentication failed'), { remaining: data.remaining, revoked: data.revoked });
  return data;
}

// ── Admin Auth ─────────────────────────────────────────────────────────────────
export async function adminLogin(password) {
  const res = await fetch(`${HTTP_URL}/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.json();
}

export async function adminLogout(token) {
  await fetch(`${HTTP_URL}/admin/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Admin API (all require Bearer token) ───────────────────────────────────────
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function adminGetStats(token) {
  const res = await fetch(`${HTTP_URL}/admin/stats`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function adminGetAll(token) {
  const res = await fetch(`${HTTP_URL}/admin/certificates`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function adminAddCertificate(token, data) {
  const res = await fetch(`${HTTP_URL}/admin/certificates`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add certificate');
  return json;
}

export async function adminUpdateCertificate(token, id, data) {
  const res = await fetch(`${HTTP_URL}/admin/update`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update');
  return json;
}

export async function adminRevoke(token, id, reason) {
  const res = await fetch(`${HTTP_URL}/admin/revoke`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id, reason }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to revoke');
  return json;
}

export async function adminRestore(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/restore`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to restore');
  return json;
}

export async function adminExpire(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/expire`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to expire');
  return json;
}

export async function adminDeleteCertificate(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/delete`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete');
  return json;
}

export async function adminSeed(token) {
  const res = await fetch(`${HTTP_URL}/admin/seed`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Seed failed');
  return json;
}

export async function adminGetNextIds(token) {
  const res = await fetch(`${HTTP_URL}/admin/next-ids`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to get next IDs');
  return res.json();
}

export async function adminGetEmployees(token) {
  const res = await fetch(`${HTTP_URL}/admin/employees`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to get employees');
  return res.json();
}

export async function adminAddEmployee(token, data) {
  const res = await fetch(`${HTTP_URL}/admin/employees`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add employee');
  return json;
}

export async function adminUpdateEmployee(token, id, data) {
  const res = await fetch(`${HTTP_URL}/admin/employees/update`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update employee');
  return json;
}

export async function adminDeleteEmployee(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/employees/delete`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete employee');
  return json;
}

// ── Public: Document Uploads (KYC) ─────────────────────────────────────────────

/**
 * Step 1: Get a short-lived upload URL from Convex.
 * Authenticates via reference number + date of birth.
 */
export async function publicDocGetUploadUrl({ ref, dob, docType, fileName, mimeType, sizeBytes }) {
  const res = await fetch(`${HTTP_URL}/public/docs/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, dob, docType, fileName, mimeType, sizeBytes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get upload URL');
  return data; // { uploadUrl, employeeId }
}

/**
 * Step 2: Upload the blob directly to Convex storage.
 * Returns { storageId } from Convex.
 */
export async function publicDocUploadBlob(uploadUrl, blob) {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { storageId }
}

/**
 * Step 3: Confirm the upload — saves metadata to the documents table.
 */
export async function publicDocConfirm({ ref, dob, employeeId, docType, storageId, fileName, mimeType, sizeBytes }) {
  const res = await fetch(`${HTTP_URL}/public/docs/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, dob, employeeId, docType, storageId, fileName, mimeType, sizeBytes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to confirm upload');
  return data;
}

// ── Admin: Document Management ─────────────────────────────────────────────────

export async function adminGetDocuments(token, employeeId) {
  const res = await fetch(`${HTTP_URL}/admin/docs?employeeId=${encodeURIComponent(employeeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json(); // { documents: [...] }
}

export async function adminGetDocSummary(token) {
  const res = await fetch(`${HTTP_URL}/admin/docs/summary`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch document summary');
  return (await res.json()).summary; // { [employeeId]: [{ docType, verified }] }
}

export async function adminOpenDocument(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/docs/open`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to open document');
  return data.url;
}

export async function adminGetDocLog(token, employeeId) {
  const res = await fetch(`${HTTP_URL}/admin/docs/log?employeeId=${encodeURIComponent(employeeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load access log');
  return data.logs;
}

export async function adminVerifyDocument(token, id, verified) {
  const res = await fetch(`${HTTP_URL}/admin/docs/verify`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id, verified }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update document');
  return data;
}

export async function adminDeleteDocument(token, id) {
  const res = await fetch(`${HTTP_URL}/admin/docs/delete`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete document');
  return data;
}

export async function publicOnboardEmployee(data) {
  const res = await fetch(`${HTTP_URL}/public/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to submit onboarding form');
  return json;
}

export async function publicUploadSigned({ ref, id, dob, file }) {
  const params = new URLSearchParams();
  if (ref) params.set('ref', ref);
  if (id) params.set('id', id);
  if (dob) params.set('dob', dob);

  const res = await fetch(`${HTTP_URL}/public/upload-signed?${params}`, {
    method: 'POST',
    body: file,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload signed document');
  return json;
}

export async function adminUploadSigned(token, id, file) {
  const res = await fetch(`${HTTP_URL}/admin/upload-signed?id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: file,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload signed document');
  return json;
}

