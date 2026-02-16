import { loadArea, setConfig } from '../utils/utils.js';

/**
 * Wraps the whole page in sp-theme so Spectrum tokens apply everywhere.
 */
async function wrapPageInSpTheme() {
  await customElements.whenDefined('sp-theme');
  const theme = document.createElement('sp-theme');
  theme.setAttribute('system', 'spectrum-two');
  theme.setAttribute('scale', 'medium');
  theme.setAttribute('color', 'light');
  while (document.body.firstChild) {
    theme.appendChild(document.body.firstChild);
  }
  document.body.appendChild(theme);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // document.documentElement.lang = 'en';
  // decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    loadArea(main);
    // document.body.classList.add('appear');
    // await loadSection(main.querySelector('.section'), waitForFirstImage);
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
