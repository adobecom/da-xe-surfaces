import { LitElement, html } from 'lit';
import { customFetch, XE_SITES_EVENT, setupCtaClickHandler } from './utils/utils.js';
import { parseHtmlToSegments } from './utils/parsePlainHtml.js';
import renderSegmentsToContainer from './components/BlockContainer.jsx';
import xeSitesContext from './context/xeSitesContext.js';
import '@react-spectrum/s2/page.css';
import './styles/typography.css';
import './styles/styles.css';

// Load fonts via Nest's approach: Typekit script + Typekit.load() (same as Nest loadTypekitAsync).
// Uses Nest's default kit (bwx4ctj) so embedded in Nest we rely on host-loaded fonts and skip.
const TYPEKIT_DEFAULT_ID = 'bwx4ctj';
const TYPEKIT_SCRIPT_TIMEOUT = 3000;
const typekitBase = 'https://use.typekit.net';
const hasTypekitScript = document.querySelector('script[src*="typekit.net/"]');
if (!hasTypekitScript) {
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = typekitBase;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);

  const de = document.documentElement;
  const timeoutId = setTimeout(() => {
    de.classList.remove('wf-loading');
    de.classList.add('wf-inactive');
  }, TYPEKIT_SCRIPT_TIMEOUT);

  const script = document.createElement('script');
  de.classList.add('wf-loading');
  script.src = `${typekitBase}/${TYPEKIT_DEFAULT_ID}.js`;
  script.async = true;
  script.onload = () => {
    clearTimeout(timeoutId);
    try {
      if (window.Typekit) {
        window.Typekit.load({
          kitId: TYPEKIT_DEFAULT_ID,
          scriptTimeout: TYPEKIT_SCRIPT_TIMEOUT,
          async: true,
        });
      }
    } catch (e) {
      // no NewRelic in da-xe-surfaces; avoid breaking init
    }
  };
  document.head.appendChild(script);
}

window.app = window.app || {};
window.app.BUILD_MODE = window.app.BUILD_MODE || 'builtin';

export const XE_SITES_TAG = 'xe-sites';

const LOADER_HTML = '<div class="xe-sites-loader" role="status" aria-label="Loading"><div class="xe-sites-loader-spinner"></div></div>';

export default class XeSites extends LitElement {
  static properties = {
    path: { type: String },
    theme: { type: String, reflect: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.path = '';
    this.loadError = '';
    this.theme = '';
    this.env = '';
    this.host = '';
    this.config = {};
  }

  async firstUpdated() {
    if (this.theme) {
      xeSitesContext.setTheme((this.theme && this.theme.trim()) || 'light');
    }
    if (this.path) {
      await this.loadFragment(this.path);
    }
    
  }

  updated(changedProperties) {
    if (changedProperties.has('theme')) {
      xeSitesContext.setTheme((this.theme && this.theme.trim()) || 'light');
    }
    if (changedProperties.has('path') && this.hasUpdated) {
      this.loadFragment(this.path);
    }
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

    const fragmentContainer = this.querySelector('#fragment-container');
    if (fragmentContainer) {
      fragmentContainer.innerHTML = LOADER_HTML;
      fragmentContainer.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
        bubbles: true,
        composed: true,
        detail: { type: 'system', subType: 'loading' },
      }));
    }

    try {
      window.hlx = window.hlx || {};
      window.hlx.codeBasePath = '';

      const fragmentPath = trimmed.endsWith('.plain.html')
        ? trimmed
        : `${trimmed.replace(/\.html?$/i, '')}.plain.html`;
      const { pathname } = new URL(fragmentPath, window.location.origin);
      const absUrl = /^https?:\/\//i.test(fragmentPath)
        ? fragmentPath
        : new URL(fragmentPath, window.location.origin).toString();
      const isCrossOrigin = new URL(absUrl).origin !== window.location.origin;
      const proxy = window.xeSitesFragmentProxy;
      const resolveUrl = (proxy && isCrossOrigin)
        ? (targetUrl) => (typeof proxy === 'function' ? proxy(targetUrl) : proxy + encodeURIComponent(targetUrl))
        : undefined;

      const maxAttempts = 3;
      const retryStatuses = [425, 503];
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

      const responseHtml = await response.text();
      if (loadId !== this.fragmentRequestId) return;

      const segments = parseHtmlToSegments(responseHtml, absUrl);
      if (loadId !== this.fragmentRequestId) return;

      this.clearFragmentContent();
      const container = this.querySelector('#fragment-container');
      if (!container) return;

      const theme = (this.theme && this.theme.trim()) || 'light';
      xeSitesContext.setTheme(theme);
      xeSitesContext.setBaseUrl(absUrl);
      xeSitesContext.setContainer(container);
      xeSitesContext.setDispatchEvent((target, detail) => {
        target.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
          bubbles: true,
          composed: true,
          detail,
        }));
      });
      setupCtaClickHandler(container);

      const reactRoot = document.createElement('div');
      reactRoot.className = 'xe-sites-react-root';
      container.appendChild(reactRoot);
      renderSegmentsToContainer(reactRoot, segments, theme);

      const contentId = xeSitesContext.getContentId();
      const contentName = xeSitesContext.getContentName();
      container.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
        bubbles: true,
        composed: true,
        detail: {
          type: 'system',
          subType: 'loaded',
          data: { contentId, contentName },
        },
      }));
    } catch (error) {
      if (loadId !== this.fragmentRequestId) return;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.clearFragmentContent();
      const container = this.querySelector('#fragment-container');
      if (container) {
        container.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
          bubbles: true,
          composed: true,
          detail: { type: 'system', subType: 'error', data: { message: this.loadError } },
        }));
      }
      // eslint-disable-next-line no-console -- fragment load failure
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
    return html`
      <div id="fragment-container" class="xe-sites-blocks" style="display: block; height: 100%; min-height: 0;"></div>
    `;
  }
}

customElements.define(XE_SITES_TAG, XeSites);
