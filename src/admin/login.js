// ─── login.js — staff sign-in ─────────────────────────────────────────────────
import { adminLogin } from '../api.js';
import { icon } from '../ui/icons.js';
import { session } from './state.js';

export function renderLogin(app, onSuccess) {
  app.className = 'ws-app';
  app.innerHTML = `
<div class="login-shell">
  <aside class="login-aside" aria-hidden="false">
    <div class="login-brand"><img src="/favicon.svg" alt=""><div><b>WaveSeed Co.</b><span>Staff portal</span></div></div>
    <div class="login-hero">
      <h1>Credentials people can <em>trust</em>.</h1>
      <p>Issue certificates and letters, collect documents and keep every business in one place — verifiable by anyone, in seconds.</p>
      <ul class="login-points">
        <li><span class="chip-icon">${icon('shield-check', { size: 18 })}</span><span><b style="color:#fff">Verifiable</b><br>Every document carries a public verification ID and QR code.</span></li>
        <li><span class="chip-icon">${icon('building', { size: 18 })}</span><span><b style="color:#fff">Multi-business</b><br>WaveSeed and its ventures, each with their own branding.</span></li>
        <li><span class="chip-icon">${icon('lock', { size: 18 })}</span><span><b style="color:#fff">Private by design</b><br>KYC documents visible only to admin and HR, with an access log.</span></li>
      </ul>
    </div>
    <div class="login-foot">© ${new Date().getFullYear()} WaveSeed Co. · Seeding the next wave</div>
  </aside>

  <main class="login-main">
    <form class="signin-card" id="login-form" novalidate>
      <div class="login-mobile-brand"><img src="/favicon.svg" alt=""><b>WaveSeed Co.</b></div>
      <h2>Welcome back</h2>
      <p class="lead">Enter your department password. Your access level is detected automatically.</p>
      <div class="login-err" id="login-err" role="alert">${icon('alert-circle', { size: 18 })}<span></span></div>
      <div class="field">
        <label for="login-pw">Password</label>
        <div class="pw-wrap">
          <input id="login-pw" class="input" type="password" autocomplete="current-password" placeholder="Enter your password" autofocus>
          <button type="button" class="btn btn--ghost btn-icon btn-sm pw-toggle" id="pw-toggle" aria-label="Show password">${icon('eye')}</button>
        </div>
      </div>
      <button class="btn btn--primary btn-lg btn-block" id="login-btn" type="submit">Sign in ${icon('arrow-right')}</button>
      <a class="signin-back" href="/">${icon('arrow-left', { size: 15 })} Back to certificate verification</a>
    </form>
  </main>
</div>`;

  const form = app.querySelector('#login-form');
  const pw = app.querySelector('#login-pw');
  const btn = app.querySelector('#login-btn');
  const err = app.querySelector('#login-err');
  const showErr = (msg) => { err.querySelector('span').textContent = msg; err.classList.add('is-on'); };

  app.querySelector('#pw-toggle').addEventListener('click', (e) => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    e.currentTarget.innerHTML = icon(show ? 'eye-off' : 'eye');
    e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    pw.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = pw.value.trim();
    err.classList.remove('is-on');
    if (!password) { showErr('Please enter your password.'); pw.focus(); return; }
    btn.classList.add('is-loading'); btn.disabled = true;
    try {
      const res = await adminLogin(password);
      if (res.valid) { session.start(res.token, res.role || 'admin'); onSuccess(); return; }
      showErr(res.error || 'Incorrect password. Please try again.');
      pw.value = ''; pw.focus();
    } catch {
      showErr('Could not reach the server. Check your connection and try again.');
    } finally {
      btn.classList.remove('is-loading'); btn.disabled = false;
    }
  });
}
