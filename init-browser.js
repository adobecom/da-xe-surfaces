/**
 * Browser-friendly entry for <xe-sites>: no CSS imports (load CSS via <link> in the page).
 * Use this when loading init as raw ES modules (e.g. xe-sites-test.html).
 * For webpack/bundled use, use init.js instead.
 */
import { LitElement, html } from 'lit';
import { loadArea, setConfig, customFetch, setupLinkClickHandler } from './utils/utils.js';

import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/core.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/theme-dark.js';
import '@spectrum-web-components/button/sp-button.js';

import pageMetadataDecorate from './blocks/page-metadata/page-metadata.js';
import rowCardDecorate from './blocks/row-card/row-card.js';
import textDecorate from './blocks/text/text.js';
import urlMetadataDecorate from './blocks/url-metadata/url-metadata.js';
import adobetvDecorate from './blocks/adobetv/adobetv.js';
import fragmentDecorate from './blocks/fragment/fragment.js';

window.app = window.app || {};
window.app.BUILD_MODE = 'builtin';

window.xeBlockRegistry = {
  'page-metadata': pageMetadataDecorate,
  fragment: fragmentDecorate,
  'row-card': rowCardDecorate,
  text: textDecorate,
  'url-metadata': urlMetadataDecorate,
  'adobe-tv': adobetvDecorate,
};

export const XE_SITES_TAG = 'xe-sites';

function getThemeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('theme')?.toLowerCase();
  if (fromQuery === 'dark' || fromQuery === 'light') return fromQuery;
  const hash = window.location.hash.slice(1);
  const fromHash = new URLSearchParams(hash).get('theme')?.toLowerCase();
  if (fromHash === 'dark' || fromHash === 'light') return fromHash;
  return 'light';
}

function getConfigForPath(pathname) {
  return {
    contentRoot: '/',
    codeRoot: '/',
    miloLibs: window.location.origin,
    pathname: pathname || window.location.pathname,
  };
}

export default class XeSites extends LitElement {
  static properties = {
    path: { type: String },
    loadError: { type: String },
    theme: { type: String },
    scale: { type: String },
    /** Environment for URL resolution: 'stage' | 'prod'. Passed from host (e.g. Boost). */
    environment: { type: String, reflect: true },
    /** Host app type for URL slot: 'cch' | 'ccd'. Passed from host (e.g. Boost). */
    host: { type: String, reflect: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.path = '';
    this.loadError = '';
    this.theme = '';
    this.scale = '';
    this.environment = '';
    this.host = '';
  }

  async firstUpdated() {
    if (this.path) {
      await this.loadFragment(this.path);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('path') && this.hasUpdated) {
      this.loadFragment(this.path);
    }
    if ((changedProperties.has('theme') || changedProperties.has('scale')) && this.hasUpdated) {
      this.syncThemeAttrs();
    }
  }

  syncThemeAttrs() {
    const container = this.querySelector('#fragment-container');
    const themeEl = container?.querySelector('sp-theme');
    if (!themeEl) return;
    const scaleVal = (this.scale && this.scale.trim()) || 'medium';
    const themeVal = (this.theme && this.theme.trim()) || getThemeFromUrl();
    themeEl.setAttribute('scale', scaleVal);
    themeEl.setAttribute('color', themeVal);
  }

  async loadFragment(url) {
    this.loadError = '';
    if (!url || !url.trim()) {
      this.clearFragmentContent();
      return;
    }

    const trimmed = url.trim();
    this.fragmentRequestId = (this.fragmentRequestId || 0) + 1;
    const loadId = this.fragmentRequestId;
    try {
      window.hlx = window.hlx || {};
      window.hlx.codeBasePath = '';

      const fragmentPath = trimmed.endsWith('.plain.html')
        ? trimmed
        : `${trimmed.replace(/\.html?$/i, '')}.plain.html`;
      const { pathname } = new URL(fragmentPath, window.location.origin);
      const baseConfig = getConfigForPath(pathname);
      const xeConfig = {
        ...baseConfig,
        ...(this.environment && { environment: this.environment }),
        ...(this.host && { host: this.host }),
      };
      setConfig(xeConfig);

      const absUrl = /^https?:\/\//i.test(fragmentPath)
        ? fragmentPath
        : new URL(fragmentPath, window.location.origin).toString();
      const isCrossOrigin = new URL(absUrl).origin !== window.location.origin;
      const proxy = window.xeSitesFragmentProxy;
      const resolveUrl = (proxy && isCrossOrigin)
        ? (targetUrl) => (typeof proxy === 'function' ? proxy(targetUrl) : proxy + encodeURIComponent(targetUrl))
        : undefined;

      const maxAttempts = 3;
      const retryStatuses = [425, 503]; // Too Early, Service Unavailable
      let response;
      /* eslint-disable no-await-in-loop -- intentional retry with delay */
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        response = await customFetch({ resource: fragmentPath, withCacheRules: true, resolveUrl });
        if (loadId !== this.fragmentRequestId) return;
        const { status, statusText } = response;
        if (response.ok) break;
        if (attempt < maxAttempts - 1 && retryStatuses.includes(status)) {
          await new Promise((r) => { setTimeout(r, 1500); });
        } else {
          throw new Error(`HTTP ${status}: ${statusText}`);
        }
      }
      /* eslint-enable no-await-in-loop */
      const responseHtml = await response.text();
      if (loadId !== this.fragmentRequestId) return;
      const parser = new DOMParser();
      const fragmentDoc = parser.parseFromString(responseHtml, 'text/html');

      const main = document.createElement('main');
      main.innerHTML = fragmentDoc.body.innerHTML;

      this.clearFragmentContent();

      const themeEl = document.createElement('sp-theme');
      const scaleVal = (this.scale && this.scale.trim()) || 'medium';
      const themeVal = (this.theme && this.theme.trim()) || getThemeFromUrl();
      themeEl.setAttribute('scale', scaleVal);
      themeEl.setAttribute('color', themeVal);
      themeEl.appendChild(main);

      this.querySelector('#fragment-container').appendChild(themeEl);

      await loadArea(main);
      if (loadId !== this.fragmentRequestId) return;

      const fragmentContainer = this.querySelector('#fragment-container');
      if (fragmentContainer) setupLinkClickHandler(fragmentContainer);

      main.querySelectorAll('img[src], picture source[srcset]').forEach((el) => {
        el.setAttribute('referrerpolicy', 'no-referrer');
      });
    } catch (error) {
      if (loadId !== this.fragmentRequestId) return;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.clearFragmentContent();
      // eslint-disable-next-line no-console
      console.error('xe-sites: Error loading fragment:', error);
    }
  }

  clearFragmentContent() {
    const container = this.querySelector('#fragment-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  render() {
    if (this.loadError) {
      return html`<p role="alert">Failed to load fragment: ${this.loadError}</p>`;
    }
    return html`<div id="fragment-container" style="display: block; height: 100%; min-height: 0;"></div>`;
  }
}

customElements.define(XE_SITES_TAG, XeSites);
