// Brand images are ordinary static files in /public/brand — cached by the browser and
// NOT embedded in the JavaScript bundle (they used to be ~1.8 MB of base64 text).
//
// Absolute URLs are used on purpose: letters and certificates are written into popup
// windows and print previews that have no base URL of their own.
const ORIGIN = (typeof location !== 'undefined' && location.origin && location.origin !== 'null')
  ? location.origin
  : 'https://verify.waveseed.app';

export const LOGO_URL  = `${ORIGIN}/brand/logo.png`;
export const STAMP_URL = `${ORIGIN}/brand/stamp.webp`;
export const SIG_URL   = `${ORIGIN}/brand/signature.webp`;
