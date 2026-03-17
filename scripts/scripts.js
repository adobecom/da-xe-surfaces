import React from 'react';
import ReactDOM from 'react-dom/client';
import { setConfig } from '../utils/utils.js';
import xeSitesContext from '../context/xeSitesContext.js';
import { XE_SITES_TAG } from '../init.js';

/**
 * Resolves theme (light | dark) from URL, defaulting to light.
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
 * Build .plain.html URL for current page (same format as xe-sites fragment fetch).
 * Root path "/" or "" maps to /index.plain.html per Franklin/AEM convention.
 */
function getPlainHtmlPath() {
  const { pathname } = window.location;
  if (pathname.endsWith('.plain.html')) return pathname;
  const trimmed = pathname.replace(/\.html?$/i, '').replace(/\/$/, '') || '';
  const base = trimmed === '' ? '/index' : trimmed;
  return `${base}.plain.html`;
}

export default async function loadPage(el) {
  const config = {
    contentRoot: '/',
    codeRoot: '/',
    miloLibs: window.location.origin,
  };
  setConfig(config);

  let container = el?.querySelector('main');
  if (!container) {
    container = el?.querySelector('body') || document.body;
  }
  if (!container) return;

  const theme = getThemeFromUrl();
  const path = getPlainHtmlPath();

  xeSitesContext.setTheme(theme);
  xeSitesContext.setBaseUrl(window.location.href);

  container.innerHTML = '';

  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(XE_SITES_TAG, { path, theme }));
}

function runWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadPage(document));
  } else {
    loadPage(document);
  }
}

if (window.app && window.app.BUILD_MODE === 'dynamic') {
  runWhenReady();
}
