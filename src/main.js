// ─── main.js — App entry point & hash router ──────────────────────────────────
import './style.css';
import { initVerifyPage } from './pages/verify.js';
import { initAdminPage }  from './pages/admin.js';
import { initOnboardPage } from './pages/onboard.js';

function route() {
  const app  = document.getElementById('app');
  const hash = window.location.hash;

  // Kill any open modals from previous page
  document.querySelectorAll('.modal-overlay, .login-overlay').forEach(el => el.remove());

  if (hash === '#admin') {
    document.title = 'Admin — WaveSeed Certificate System';
    initAdminPage(app);
  } else if (hash === '#onboard') {
    document.title = 'Employee Onboarding — WaveSeed Co.';
    initOnboardPage(app);
  } else {
    document.title = 'WaveSeed Certificate Verification | verify.waveseed.app';
    initVerifyPage(app);
  }
}

// Hash-based SPA routing — works with any static host
window.addEventListener('hashchange', route);

// Initial render
route();
