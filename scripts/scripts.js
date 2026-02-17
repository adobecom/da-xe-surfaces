import { loadArea, setConfig } from '../utils/utils.js';

/**
 * Resolves theme (light | dark) from URL, defaulting to light.
 * Supports: ?theme=dark | ?theme=light, or #theme=dark in hash.
 */
function getThemeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('theme')?.toLowerCase();
  if (fromQuery === 'dark' || fromQuery === 'light') return fromQuery;
  const hash = window.location.hash.slice(1);
  const fromHash = new URLSearchParams(hash).get('theme')?.toLowerCase();
  if (fromHash === 'dark' || fromHash === 'light') return fromHash;
  return 'light';
}

/**
 * Wraps the whole page in sp-theme so Spectrum tokens apply everywhere.
 */
async function wrapPageInSpTheme() {
  await customElements.whenDefined('sp-theme');
  const themeEl = document.createElement('sp-theme');
  themeEl.setAttribute('system', 'spectrum-two');
  themeEl.setAttribute('scale', 'medium');
  themeEl.setAttribute('color', getThemeFromUrl());
  while (document.body.firstChild) {
    themeEl.appendChild(document.body.firstChild);
  }
  document.body.appendChild(themeEl);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  const main = doc.querySelector('main');
  if (main) {
    await loadArea(main);
  }
}

const config = {
  contentRoot: "/",
  codeRoot: "/",
  miloLibs: window.location.origin
};

export default async function loadPage(el) {
  setConfig(config);
  await wrapPageInSpTheme();
  await loadEager(el);
}

if (window.app && window.app.BUILD_MODE === "dynamic") {
  loadPage(document);
}
