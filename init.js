import { LitElement, html } from 'lit';
import { loadArea, setConfig, customFetch, setupLinkClickHandler, XE_SITES_EVENT } from './utils/utils.js';

// xe-* components: isolated from host sp-* (auto-generated from xe-components.config.cjs)
import './xe-components.js';
import '@spectrum-web-components/theme/core.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/theme-dark.js';
// Spectrum Two (S2) — use theme-system="spectrum-two" to align with React Spectrum S2
import '@spectrum-web-components/theme/src/spectrum-two/themes-core-tokens.js';

// Static block JS imports (webpack can't dynamically resolve via file: symlink)
import pageMetadataDecorate from './blocks/page-metadata/page-metadata.js';
import rowCardDecorate from './blocks/row-card/row-card.js';
import textDecorate from './blocks/text/text.js';
import adobetvDecorate from './blocks/adobetv/adobetv.js';

// Static CSS imports — webpack bundles these (runtime loadCSS would 404 in nest)
import './styles/styles.css';
import './blocks/page-metadata/page-metadata.css';
import './blocks/row-card/row-card.css';
import './blocks/text/text.css';
import './blocks/adobetv/adobetv.css';

// Skip runtime CSS loading (files aren't served by nest, webpack already bundled them)
window.app = window.app || {};
window.app.BUILD_MODE = window.app.BUILD_MODE || 'builtin';

// Block registry — loadBlock checks this before attempting dynamic import.
window.xeBlockRegistry = {
  'page-metadata': pageMetadataDecorate,
  'row-card': rowCardDecorate,
  text: textDecorate,
  adobetv: adobetvDecorate, // fragment class can be adobetv (no hyphen)
};

export const XE_SITES_TAG = 'xe-sites';

function getConfigForPath(pathname) {
  return {
    contentRoot: '/',
    codeRoot: '/',
    libs: window.location.origin,
    pathname: pathname || window.location.pathname,
  };
}

export default class XeSites extends LitElement {
  static properties = {
    /** Fragment URL: relative or absolute. */
    path: { type: String },
    /** Theme for xe-theme: 'light' | 'dark'. Overrides URL when set (e.g. Boost). */
    theme: { type: String, reflect: true },
    /** Scale for xe-theme: 'medium' | 'large'. Default 'medium'. */
    scale: { type: String, reflect: true },
  };

  /** Light DOM: block CSS in document.head; postcss-prefixwrap scopes to xe-sites. */
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.path = '';
    this.loadError = '';
    this.theme = '';
    this.scale = '';
    this.themeSystem = '';
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
  }

  /**
   * Resolve xe-theme system, color, and scale from xe-sites props.
   * When themeSystem is 'spectrum-two', uses S2 fragment names (aligns with React Spectrum S2).
   */
  getThemeAttrs() {
    const system = 'spectrum-two';
    const raw = this.theme && this.theme.trim();
    const scaleInput = (this.scale && this.scale.trim()) || 'medium';

    return {
      system,
      color: raw,
      scale: scaleInput,
    };
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
      // Use inner main's content so loadArea's :scope > div finds section divs.
      const fragmentMain = fragmentDoc.body.querySelector('main');
      main.innerHTML = fragmentMain ? fragmentMain.innerHTML : fragmentDoc.body.innerHTML;

      this.clearFragmentContent();

      const fragmentContainer = this.querySelector('#fragment-container');
      const themeEl = document.createElement('xe-theme');
      const { system, color, scale } = this.getThemeAttrs();
      themeEl.setAttribute('system', system);
      themeEl.setAttribute('color', color);
      themeEl.setAttribute('scale', scale);
      themeEl.appendChild(main);
      fragmentContainer.appendChild(themeEl);

      // Force theme to resolve with correct system/color/scale before blocks run.
      // xe-theme's first adoptStyles() can run with default (spectrum/light) before attrs are set;
      // re-adopt so tokens (e.g. button content color) resolve from spectrum-two + requested color.
      await themeEl.updateComplete;
      themeEl.requestUpdate();
      await themeEl.updateComplete;

      await loadArea(main);
      if (loadId !== this.fragmentRequestId) return;

      if (fragmentContainer) setupLinkClickHandler(fragmentContainer);

      main.querySelectorAll('img[src], picture source[srcset]').forEach((el) => {
        el.setAttribute('referrerpolicy', 'no-referrer');
      });
      const { body } = document;
      this.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
        bubbles: true,
        detail: {
          type: 'system',
          subType: 'loaded',
          data: {
            contentId: body?.getAttribute?.('data-content-id') || '',
            contentName: body?.getAttribute?.('data-content-name') || '',
          },
        },
      }));
    } catch (error) {
      if (loadId !== this.fragmentRequestId) return;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.clearFragmentContent();
      this.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
        bubbles: true,
        detail: { type: 'system', subType: 'error', data: { message: this.loadError } },
      }));
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
    /* xe-sites-reset blocks Nest inheritance; block CSS (xe-sites .block) still applies */
    return html`
      <div id="fragment-container" style="display: block; height: 100%; min-height: 0;"></div>
    `;
  }
}

customElements.define(XE_SITES_TAG, XeSites);
