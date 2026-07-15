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

