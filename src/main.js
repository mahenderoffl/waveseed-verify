// ─── main.js — App entry point & hash router ──────────────────────────────────
import './style.css';
import { initVerifyPage }   from './pages/verify.js';
import { initAdminPage }    from './pages/admin.js';
import { initOnboardPage }  from './pages/onboard.js';
import { initDownloadPage } from './pages/download.js';
import { initUploadPage }   from './pages/upload.js';

function route() {
  const app  = document.getElementById('app');
  const hash = window.location.hash.split('?')[0]; // strip query params for routing
  const onboardMatch = hash.match(/^#onboard(?:\/([A-Za-z]{2,6}))?$/);   // #onboard or #onboard/wsg

  // Kill any open modals from previous page
  document.querySelectorAll('.modal-overlay, .login-overlay').forEach(el => el.remove());

  if (hash === '#admin') {
    document.title = 'Admin — WaveSeed Certificate System';
    initAdminPage(app);
  } else if (onboardMatch) {
    document.title = 'Onboarding — WaveSeed';
    initOnboardPage(app, onboardMatch[1] || '');
  } else if (hash === '#upload') {
    document.title = 'Document Upload — WaveSeed Co.';
    initUploadPage(app);
  } else if (hash === '#download') {
    document.title = 'Access Your Document — WaveSeed Co.';
    initDownloadPage(app);
  } else {
    document.title = 'WaveSeed Certificate Verification | verify.waveseed.app';
    initVerifyPage(app);
  }
}

// Hash-based SPA routing — works with any static host
window.addEventListener('hashchange', route);

// Initial render
route();
