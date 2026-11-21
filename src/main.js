// ─── main.js — App entry point & hash router ──────────────────────────────────
// Every page is loaded on demand, so visitors to the public verification page do not
// download the admin application (or anything else they never open).
import './style.css';
import './styles/design.css';
import './styles/admin.css';
import './styles/journey.css';

const PAGES = {
  verify:   () => import('./pages/verify.js').then(m => m.initVerifyPage),
  admin:    () => import('./admin/app.js').then(m => m.initAdminApp),
  onboard:  () => import('./pages/onboard.js').then(m => m.initOnboardPage),
  upload:   () => import('./pages/upload.js').then(m => m.initUploadPage),
  accept:   () => import('./pages/accept.js').then(m => m.initAcceptPage),
  welcome:  () => import('./pages/welcome.js').then(m => m.initWelcomePage),
  download: () => import('./pages/download.js').then(m => m.initDownloadPage),
  ui:       () => import('./pages/styleguide.js').then(m => m.initStyleGuidePage),
  // Safety net: the previous admin, reachable at #admin-classic while the new one settles in
  classic:  () => import('./pages/admin.js').then(m => m.initAdminPage),
};

let routeToken = 0;   // guards against a slow page finishing after the user already moved on
let currentKey = '';  // which top-level page is mounted ('admin', 'verify', …)

function splash(app) {
  app.innerHTML = '<div class="app-splash" role="status" aria-live="polite"><div class="spinner"></div><span class="sr-only">Loading…</span></div>';
}

async function route() {
  const token = ++routeToken;
  const app  = document.getElementById('app');
  const hash = window.location.hash.split('?')[0]; // strip query params for routing
  const onboardMatch = hash.match(/^#onboard(?:\/([A-Za-z]{2,6}))?$/);   // #onboard or #onboard/wsg

  // Kill any open modals from previous page
  document.querySelectorAll('.modal-overlay, .login-overlay, .ws-modal, .palette, .menu[data-pop]').forEach(el => el.remove());

  let key, title, args = [];
  if (hash === '#admin' || hash.startsWith('#admin/')) {
    key = 'admin';    title = 'Admin — WaveSeed Certificate System';
  } else if (onboardMatch) {
    key = 'onboard';  title = 'Onboarding — WaveSeed';  args = [onboardMatch[1] || ''];
  } else if (hash === '#accept') {
    key = 'accept';   title = 'Accept your offer — WaveSeed Co.';
  } else if (hash === '#welcome') {
    key = 'welcome';  title = 'Welcome — WaveSeed Co.';
  } else if (hash === '#upload') {
    key = 'upload';   title = 'Document Upload — WaveSeed Co.';
  } else if (hash === '#admin-classic') {
    key = 'classic';  title = 'Admin (classic) — WaveSeed';
  } else if (hash === '#ui') {
    key = 'ui';       title = 'Design system — WaveSeed';
  } else if (hash === '#download') {
    key = 'download'; title = 'Access Your Document — WaveSeed Co.';
  } else {
    key = 'verify';   title = 'WaveSeed Certificate Verification | verify.waveseed.app';
  }

  // Moving between admin screens is handled inside the admin app (no full re-mount).
  if (key === 'admin' && currentKey === 'admin') return;
  currentKey = key;

  document.title = title;
  splash(app);
  try {
    const init = await PAGES[key]();
    if (token !== routeToken) return;     // a newer navigation won
    await init(app, ...args);
  } catch (err) {
    console.error('Failed to load page', key, err);
    if (token !== routeToken) return;
    app.innerHTML = `<div class="app-splash"><div style="max-width:420px;text-align:center;padding:24px;color:#fff;">
      <h2 style="font-family:'Playfair Display',serif;margin-bottom:8px;">Something went wrong</h2>
      <p style="color:#9fb0d4;margin-bottom:16px;">The page could not be loaded. Please check your connection and try again.</p>
      <button onclick="location.reload()" style="padding:10px 22px;border-radius:10px;border:0;background:#c9a227;color:#0d1b3e;font-weight:700;cursor:pointer;">Reload</button></div></div>`;
  }
}

// Hash-based SPA routing — works with any static host
window.addEventListener('hashchange', route);

// Initial render
route();
